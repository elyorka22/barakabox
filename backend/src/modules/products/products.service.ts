import { ProductUnit, CashbackType, Prisma, SellingMode } from '@prisma/client';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { UploadService } from '../upload/upload.service';
import type { UpdateProductDto } from './dto/update-product.dto';
import {
  mapStorefrontProduct,
  storefrontProductSelect,
  type StorefrontProductRow,
} from './storefront-product.mapper';
import {
  productHasStorefrontDiscount,
  sortPromotionRows,
  type PromotionSort,
} from './promotion-product.util';

function defaultSellingModeForUnit(unit: ProductUnit): SellingMode {
  if (unit === 'kg') return 'KILOGRAM_STEP';
  if (unit === 'gramm') return 'GRAM_STEP';
  return 'PIECE';
}

const STOREFRONT_WHERE: Prisma.ProductWhereInput = {
  isActive: true,
  business: { status: 'APPROVED' },
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly cache: CacheService,
  ) {}

  private async touchCatalogCache(): Promise<void> {
    await this.cache.invalidateStorefrontCatalog();
  }

  private mapRows(rows: StorefrontProductRow[]) {
    return rows.map((row) => mapStorefrontProduct(row));
  }

  private mapPromotionRows(rows: StorefrontProductRow[]) {
    return rows.map((row) => mapStorefrontProduct(row, { withPromotionMeta: true }));
  }

  private async queryPromotionProductRows(sort: PromotionSort, maxScan = 400) {
    const now = new Date();
    const candidates = await this.prisma.product.findMany({
      where: {
        ...STOREFRONT_WHERE,
        OR: [
          {
            discountEnabled: true,
            discountedPrice: { not: null, gt: 0 },
          },
          { promotionEnabled: true },
          {
            variants: {
              some: {
                isActive: true,
                discountPrice: { not: null, gt: 0 },
              },
            },
          },
        ],
      },
      select: storefrontProductSelect,
      orderBy: { createdAt: 'desc' },
      take: maxScan,
    });
    return sortPromotionRows(
      candidates.filter((row) => productHasStorefrontDiscount(row, now)),
      sort,
    );
  }

  /** Paginated promotional products — server-filtered, Redis-cached. */
  async listPromotionsPaginated(opts?: {
    page?: number;
    limit?: number;
    sort?: PromotionSort;
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts?.limit ?? 24));
    const sort: PromotionSort = opts?.sort === 'discount_desc' ? 'discount_desc' : 'newest';
    const catalogVersion = (await this.cache.get<number>(cacheKeys.catalogVersion())) ?? 0;
    const cacheKey = cacheKeys.productsPromotions(catalogVersion, page, limit, sort);

    return this.cache.getOrSet(cacheKey, CACHE_TTL.productsPromotions, async () => {
      const sorted = await this.queryPromotionProductRows(sort);
      const total = sorted.length;
      const skip = (page - 1) * limit;
      const slice = sorted.slice(skip, skip + limit);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return {
        items: this.mapPromotionRows(slice),
        total,
        page,
        totalPages,
        hasMore: page < totalPages,
      };
    });
  }

  private buildStorefrontListResult(
    rows: StorefrontProductRow[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items: this.mapRows(rows),
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /** Paginated storefront catalog with optional search and filters. */
  async listPaginated(opts: {
    page?: number;
    limit?: number;
    categoryId?: string;
    businessId?: string;
    search?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc';
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts.limit ?? 24));
    const skip = (page - 1) * limit;
    const sort = opts.sort ?? 'newest';
    const categoryId = opts.categoryId?.trim();
    const businessId = opts.businessId?.trim();
    const search = opts.search?.trim();

    const cacheKey = cacheKeys.productsList(page, limit, categoryId, businessId, search, sort);
    return this.cache.getOrSet(cacheKey, CACHE_TTL.productsList, async () => {
      if (search) {
        return this.listPaginatedSearch({
          page,
          limit,
          skip,
          search,
          categoryId,
          businessId,
          sort,
        });
      }

      const where: Prisma.ProductWhereInput = { ...STOREFRONT_WHERE };
      if (categoryId) where.categoryId = categoryId;
      if (businessId) where.businessId = businessId;

      const orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] =
        sort === 'price_asc'
          ? { price: 'asc' }
          : sort === 'price_desc'
            ? { price: 'desc' }
            : categoryId || businessId
              ? { createdAt: 'desc' }
              : [
                  { category: { sortOrder: 'asc' } },
                  { category: { name: 'asc' } },
                  { name: 'asc' },
                ];

      const [rows, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          select: storefrontProductSelect,
          orderBy,
        }),
        this.prisma.product.count({ where }),
      ]);

      return this.buildStorefrontListResult(rows, total, page, limit);
    });
  }

  private async listPaginatedSearch(opts: {
    page: number;
    limit: number;
    skip: number;
    search: string;
    categoryId?: string;
    businessId?: string;
    sort: 'newest' | 'price_asc' | 'price_desc';
  }) {
    const pattern = `%${opts.search}%`;
    const categoryFilter = opts.categoryId
      ? Prisma.sql`AND p."categoryId" = ${opts.categoryId}`
      : Prisma.empty;
    const businessFilter = opts.businessId
      ? Prisma.sql`AND p."businessId" = ${opts.businessId}`
      : Prisma.empty;
    const orderSql =
      opts.sort === 'price_asc'
        ? Prisma.sql`ORDER BY p.price ASC`
        : opts.sort === 'price_desc'
          ? Prisma.sql`ORDER BY p.price DESC`
          : Prisma.sql`ORDER BY p."createdAt" DESC`;

    const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT p.id
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id AND v."isActive" = true
      WHERE p."isActive" = true
        AND EXISTS (
          SELECT 1 FROM "BusinessProfile" b
          WHERE b.id = p."businessId" AND b.status = 'APPROVED'
        )
        ${categoryFilter}
        ${businessFilter}
        AND (
          p.name ILIKE ${pattern}
          OR v.title ILIKE ${pattern}
          OR v.flavor ILIKE ${pattern}
          OR v.sku ILIKE ${pattern}
          OR v.barcode ILIKE ${pattern}
        )
      ${orderSql}
      LIMIT ${opts.limit} OFFSET ${opts.skip}
    `;

    const productIds = ids.map((r) => r.id);
    if (productIds.length === 0) {
      return this.buildStorefrontListResult([], 0, opts.page, opts.limit);
    }

    const rows = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: storefrontProductSelect,
    });
    const order = new Map(productIds.map((id, i) => [id, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT p.id)::bigint AS count
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id AND v."isActive" = true
      WHERE p."isActive" = true
        AND EXISTS (
          SELECT 1 FROM "BusinessProfile" b
          WHERE b.id = p."businessId" AND b.status = 'APPROVED'
        )
        ${categoryFilter}
        ${businessFilter}
        AND (
          p.name ILIKE ${pattern}
          OR v.title ILIKE ${pattern}
          OR v.flavor ILIKE ${pattern}
          OR v.sku ILIKE ${pattern}
          OR v.barcode ILIKE ${pattern}
        )
    `;
    const total = Number(countRows[0]?.count ?? 0);

    return this.buildStorefrontListResult(rows, total, opts.page, opts.limit);
  }

  /** Homepage sections — capped product counts, cached. */
  private static readonly TOP_PRODUCTS_MAX = 15;

  /** Curated homepage top products — cached separately from /products/home. */
  async getTopProducts(limit = 15) {
    const clamped = Math.min(
      ProductsService.TOP_PRODUCTS_MAX,
      Math.max(1, limit),
    );
    return this.cache.getOrSet(cacheKeys.productsTop(clamped), CACHE_TTL.productsTop, async () => {
      const rows = await this.prisma.product.findMany({
        where: { ...STOREFRONT_WHERE, isTopProduct: true },
        select: storefrontProductSelect,
        orderBy: [{ topOrder: 'asc' }, { updatedAt: 'desc' }],
        take: clamped,
      });
      return { items: this.mapRows(rows) };
    });
  }

  async listTopProductsForAdmin() {
    const rows = await this.prisma.product.findMany({
      where: { isTopProduct: true },
      select: {
        id: true,
        name: true,
        topOrder: true,
        topBadge: true,
        isActive: true,
        stockQuantity: true,
        imageThumbUrl: true,
        imageCardUrl: true,
        imageUrl: true,
        business: { select: { displayName: true } },
      },
      orderBy: [{ topOrder: 'asc' }, { updatedAt: 'desc' }],
      take: ProductsService.TOP_PRODUCTS_MAX,
    });
    return { items: rows };
  }

  async updateTopProductsBulk(
    items: Array<{
      id: string;
      isTopProduct?: boolean;
      topOrder?: number;
      topBadge?: string | null;
    }>,
  ) {
    const allowedBadges = new Set(['TOP', 'Trend', 'Mashhur', 'Tavsiya']);
    const normalized = items.slice(0, ProductsService.TOP_PRODUCTS_MAX);

    await this.prisma.$transaction(async (tx) => {
      let order = 1;
      for (const item of normalized) {
        const product = await tx.product.findUnique({ where: { id: item.id } });
        if (!product) {
          throw new NotFoundException(`Product not found: ${item.id}`);
        }

        const isTop = item.isTopProduct ?? product.isTopProduct;
        let topOrder = item.topOrder;
        if (isTop) {
          if (topOrder === undefined || topOrder <= 0) {
            topOrder = order;
            order += 1;
          }
        } else {
          topOrder = 0;
        }

        let topBadge: string | null =
          item.topBadge !== undefined ? item.topBadge : product.topBadge;
        if (!isTop) {
          topBadge = null;
        } else if (topBadge && !allowedBadges.has(topBadge)) {
          topBadge = null;
        }

        await tx.product.update({
          where: { id: item.id },
          data: {
            isTopProduct: isTop,
            topOrder: isTop ? topOrder : 0,
            topBadge: isTop ? topBadge : null,
          },
        });
      }
    });

    void this.touchCatalogCache();
    return this.listTopProductsForAdmin();
  }

  async getHomepageSections() {
    return this.cache.getOrSet(cacheKeys.productsHome(), CACHE_TTL.productsHome, async () => {
      const sectionLimit = 12;

      const allRows = await this.prisma.product.findMany({
        where: STOREFRONT_WHERE,
        select: storefrontProductSelect,
        orderBy: { createdAt: 'desc' },
        take: 80,
      });

      const mapped = this.mapRows(allRows);
      const promoRows = await this.queryPromotionProductRows('discount_desc');
      const discounted = this.mapPromotionRows(promoRows.slice(0, sectionLimit));
      const discountedIds = new Set(discounted.map((p) => p.id));
      const rest = mapped.filter((p) => !discountedIds.has(p.id));

      const catalogVersion = (await this.cache.get<number>(cacheKeys.catalogVersion())) ?? 1;
      return {
        discounted,
        popular: rest.slice(0, sectionLimit),
        recommended: rest.slice(sectionLimit, sectionLimit * 2),
        catalogVersion,
      };
    });
  }

  /** @deprecated Use listPaginated — kept for internal compatibility. */
  list() {
    return this.listPaginated({ page: 1, limit: 24 }).then((r) => r.items);
  }

  private async requireApprovedBusiness(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = (user?.role ?? '').toString().toUpperCase();

    let business;
    if (role === 'STORE_OWNER') {
      const store = await this.prisma.store.findFirst({
        where: { ownerUserId: userId, isActive: true },
        select: { businessProfileId: true },
      });
      if (!store?.businessProfileId) {
        throw new ForbiddenException('Business is not approved');
      }
      business = await this.prisma.businessProfile.findUnique({
        where: { id: store.businessProfileId },
      });
    } else {
      business = await this.prisma.businessProfile.findUnique({
        where: { userId },
      });
    }

    if (!business || business.status !== 'APPROVED') {
      throw new ForbiddenException('Business is not approved');
    }
    return business;
  }

  listForAdmin(opts?: {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
    businessId?: string;
    includeInactive?: boolean;
    stockFilter?: 'all' | 'in_stock' | 'low' | 'out';
    sortBy?: 'newest' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc';
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();

    const where: Prisma.ProductWhereInput = {};
    if (!opts?.includeInactive) {
      where.isActive = true;
    }
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }
    if (opts?.categoryId) {
      where.categoryId = opts.categoryId;
    }
    if (opts?.businessId) {
      where.businessId = opts.businessId;
    }
    const stockFilter = opts?.stockFilter ?? 'all';
    if (stockFilter === 'out') {
      where.stockQuantity = { lte: 0 };
    } else if (stockFilter === 'low') {
      where.stockQuantity = { gt: 0, lte: 5 };
    } else if (stockFilter === 'in_stock') {
      where.stockQuantity = { gt: 5 };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      opts?.sortBy === 'stock_asc'
        ? { stockQuantity: 'asc' }
        : opts?.sortBy === 'stock_desc'
          ? { stockQuantity: 'desc' }
          : opts?.sortBy === 'price_asc'
            ? { price: 'asc' }
            : opts?.sortBy === 'price_desc'
              ? { price: 'desc' }
              : { updatedAt: 'desc' };

    const select: any = {
      id: true,
      name: true,
      price: true,
      stockQuantity: true,
      unit: true,
      sellingMode: true,
      stepAmount: true,
      minimumAmount: true,
      discountEnabled: true,
      discountedPrice: true,
      promotionBadge: true,
      promotionEnabled: true,
      promotionStartAt: true,
      promotionEndAt: true,
      businessId: true,
      isActive: true,
      isTopProduct: true,
      topOrder: true,
      topBadge: true,
      createdAt: true,
      updatedAt: true,
      cashbackType: true,
      cashbackValue: true,
      imageThumbUrl: true,
      imageCardUrl: true,
      imageUrl: true,
      imageKey: true,
      category: { select: { id: true, name: true } },
      business: { select: { id: true, displayName: true } },
      variants: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          id: true,
          title: true,
          flavor: true,
          description: true,
          price: true,
          discountPrice: true,
          stock: true,
          sku: true,
          imageUrl: true,
        },
      },
    };

    return Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        select,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }

  /** @deprecated Use listPaginated({ search }) */
  search(term: string, page = 1, limit = 20) {
    return this.listPaginated({ search: term, page, limit });
  }

  async createByAdmin(
    businessId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      discountEnabled?: boolean;
      discountedPrice?: number;
      promotionBadge?: 'HOT' | 'TOP' | 'YANGI' | 'AKSIYA' | 'PREMIUM';
      promotionEnabled?: boolean;
      promotionStartAt?: string;
      promotionEndAt?: string;
      stockQuantity: number;
      unit: ProductUnit;
      sellingMode?: SellingMode;
      stepAmount?: number;
      minimumAmount?: number;
      cashbackType?: CashbackType;
      cashbackValue?: number;
      isTopProduct?: boolean;
      topOrder?: number;
      topBadge?: string | null;
      categoryId?: string;
      imageUrl?: string;
      imageKey?: string;
      imageCardUrl?: string;
      imageCardKey?: string;
      imageThumbUrl?: string;
      imageThumbKey?: string;
      variants?: Array<{
        title: string;
        flavor?: string;
        size?: string;
        sku?: string;
        barcode?: string;
        description?: string;
        price: number;
        discountPrice?: number;
        stock: number;
        imageUrl?: string;
        sortOrder?: number;
      }>;
    },
  ) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id: businessId },
    });
    if (!business || business.status !== 'APPROVED') {
      throw new NotFoundException('Approved business not found');
    }

    const sellingMode = data.sellingMode ?? defaultSellingModeForUnit(data.unit);
    return this.prisma.$transaction(async (tx) => {
      const topFields = await this.buildTopProductPatch(
        tx,
        { id: 'new', isTopProduct: false, topOrder: 0, topBadge: null },
        data,
      );
      const product = await tx.product.create({
        data: {
          businessId: business.id,
          name: data.name,
          description: data.description,
          unit: data.unit,
          sellingMode,
          stepAmount: data.stepAmount ?? null,
          minimumAmount: data.minimumAmount ?? null,
          price: data.price,
          discountEnabled: data.discountEnabled ?? false,
          discountedPrice: data.discountEnabled ? (data.discountedPrice ?? null) : null,
          promotionBadge: data.promotionBadge,
          promotionEnabled: data.promotionEnabled ?? false,
          promotionStartAt: data.promotionStartAt ? new Date(data.promotionStartAt) : null,
          promotionEndAt: data.promotionEndAt ? new Date(data.promotionEndAt) : null,
          stockQuantity: data.stockQuantity,
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          imageKey: data.imageKey,
          imageCardUrl: data.imageCardUrl,
          imageCardKey: data.imageCardKey,
          imageThumbUrl: data.imageThumbUrl,
          imageThumbKey: data.imageThumbKey,
          cashbackType: data.cashbackType ?? 'NONE',
          cashbackValue: data.cashbackValue ?? 0,
          isTopProduct: topFields.isTopProduct === true,
          topOrder: typeof topFields.topOrder === 'number' ? topFields.topOrder : 0,
          topBadge: (topFields.topBadge as string | null) ?? null,
          variants: {
            create: (data.variants?.length
              ? data.variants
              : [
                  {
                    title: data.name,
                    description: data.description,
                    price: data.price,
                    stock: data.stockQuantity,
                    imageUrl: data.imageUrl,
                    sortOrder: 0,
                  },
                ]
            ).map((variant, idx) => ({
              title: variant.title,
              flavor: variant.flavor,
              size: variant.size,
              sku: variant.sku,
              barcode: variant.barcode,
              description: variant.description,
              price: variant.price,
              discountPrice: variant.discountPrice,
              stock: variant.stock,
              imageUrl: variant.imageUrl,
              sortOrder: variant.sortOrder ?? idx,
            })),
          },
        } as any,
      });
      if (data.stockQuantity > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            change: data.stockQuantity,
            reason: 'INCOME',
          },
        });
      }
      void this.touchCatalogCache();
      return product;
    });
  }

  async createByBusinessOwner(userId: string, data: Parameters<ProductsService['createByAdmin']>[1]) {
    const business = await this.requireApprovedBusiness(userId);
    return this.createByAdmin(business.id, data);
  }

  private async buildTopProductPatch(
    tx: Prisma.TransactionClient,
    product: { id: string; isTopProduct: boolean; topOrder: number; topBadge: string | null },
    data: {
      isTopProduct?: boolean;
      topOrder?: number;
      topBadge?: string | null;
    },
  ): Promise<Prisma.ProductUpdateInput> {
    const allowedBadges = new Set(['TOP', 'Trend', 'Mashhur', 'Tavsiya']);
    if (
      data.isTopProduct === undefined &&
      data.topOrder === undefined &&
      data.topBadge === undefined
    ) {
      return {};
    }

    const nextIsTop = data.isTopProduct ?? product.isTopProduct;
    if (!nextIsTop) {
      return { isTopProduct: false, topOrder: 0, topBadge: null };
    }

    if (data.isTopProduct === true && !product.isTopProduct) {
      const count = await tx.product.count({ where: { isTopProduct: true } });
      if (count >= ProductsService.TOP_PRODUCTS_MAX) {
        throw new BadRequestException(
          `Eng ko‘pi bilan ${ProductsService.TOP_PRODUCTS_MAX} ta top mahsulot bo‘lishi mumkin`,
        );
      }
    }

    let nextOrder = data.topOrder ?? product.topOrder;
    if (!nextOrder || nextOrder <= 0) {
      const agg = await tx.product.aggregate({
        where: { isTopProduct: true, id: { not: product.id } },
        _max: { topOrder: true },
      });
      nextOrder = (agg._max.topOrder ?? 0) + 1;
    }

    let nextBadge = data.topBadge !== undefined ? data.topBadge : product.topBadge;
    if (nextBadge && !allowedBadges.has(nextBadge)) {
      nextBadge = null;
    }

    return {
      isTopProduct: true,
      topOrder: nextOrder,
      topBadge: nextBadge,
    };
  }

  async listMine(userId: string) {
    const business = await this.requireApprovedBusiness(userId);
    return this.prisma.product.findMany({
      where: { businessId: business.id },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateByAdmin(
    productId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      discountEnabled?: boolean;
      discountedPrice?: number;
      promotionBadge?: 'HOT' | 'TOP' | 'YANGI' | 'AKSIYA' | 'PREMIUM';
      promotionEnabled?: boolean;
      promotionStartAt?: string;
      promotionEndAt?: string;
      stockQuantity?: number;
      unit?: ProductUnit;
      sellingMode?: SellingMode;
      stepAmount?: number;
      minimumAmount?: number;
      cashbackType?: CashbackType;
      cashbackValue?: number;
      isTopProduct?: boolean;
      topOrder?: number;
      topBadge?: string | null;
      categoryId?: string;
      imageUrl?: string;
      imageKey?: string;
      imageCardUrl?: string;
      imageCardKey?: string;
      imageThumbUrl?: string;
      imageThumbKey?: string;
      variants?: Array<{
        id?: string;
        title: string;
        flavor?: string;
        size?: string;
        sku?: string;
        barcode?: string;
        description?: string;
        price: number;
        discountPrice?: number;
        stock: number;
        imageUrl?: string;
        sortOrder?: number;
      }>;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const cleanupPairs: Array<{ old?: string | null; next?: string | null }> = [
      { old: product.imageKey, next: data.imageKey },
      { old: product.imageCardKey, next: data.imageCardKey },
      { old: product.imageThumbKey, next: data.imageThumbKey },
    ];
    for (const pair of cleanupPairs) {
      if (pair.old && (!pair.next || pair.old !== pair.next)) {
        await this.uploadService.deleteImage(pair.old);
      }
    }
    return this.prisma.$transaction(async (tx) => {
      if (data.variants) {
        const incomingIds = data.variants.map((variant) => variant.id).filter(Boolean) as string[];
        await tx.productVariant.updateMany({
          where: {
            productId,
            ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}),
          },
          data: { isActive: false },
        });
        for (let i = 0; i < data.variants.length; i += 1) {
          const variant = data.variants[i];
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                title: variant.title,
                flavor: variant.flavor,
                size: variant.size,
                sku: variant.sku,
                barcode: variant.barcode,
                description: variant.description,
                price: variant.price,
                discountPrice: variant.discountPrice,
                stock: variant.stock,
                imageUrl: variant.imageUrl,
                sortOrder: variant.sortOrder ?? i,
                isActive: true,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                title: variant.title,
                flavor: variant.flavor,
                size: variant.size,
                sku: variant.sku,
                barcode: variant.barcode,
                description: variant.description,
                price: variant.price,
                discountPrice: variant.discountPrice,
                stock: variant.stock,
                imageUrl: variant.imageUrl,
                sortOrder: variant.sortOrder ?? i,
                isActive: true,
              },
            });
          }
        }
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          ...(data.discountEnabled !== undefined ? { discountEnabled: data.discountEnabled } : {}),
          ...(data.discountEnabled === false ? { discountedPrice: null } : {}),
          ...(data.discountEnabled === true
            ? { discountedPrice: data.discountedPrice ?? null }
            : data.discountedPrice !== undefined
              ? { discountedPrice: data.discountedPrice }
              : {}),
          ...(data.promotionBadge !== undefined ? { promotionBadge: data.promotionBadge } : {}),
          ...(data.promotionEnabled !== undefined ? { promotionEnabled: data.promotionEnabled } : {}),
          ...(data.promotionStartAt !== undefined
            ? { promotionStartAt: data.promotionStartAt ? new Date(data.promotionStartAt) : null }
            : {}),
          ...(data.promotionEndAt !== undefined
            ? { promotionEndAt: data.promotionEndAt ? new Date(data.promotionEndAt) : null }
            : {}),
          stockQuantity: data.stockQuantity,
          ...(data.unit !== undefined ? { unit: data.unit } : {}),
          ...(data.sellingMode !== undefined ? { sellingMode: data.sellingMode } : {}),
          ...(data.stepAmount !== undefined ? { stepAmount: data.stepAmount } : {}),
          ...(data.minimumAmount !== undefined ? { minimumAmount: data.minimumAmount } : {}),
          ...(data.cashbackType !== undefined ? { cashbackType: data.cashbackType } : {}),
          ...(data.cashbackValue !== undefined ? { cashbackValue: data.cashbackValue } : {}),
          ...(await this.buildTopProductPatch(tx, product, data)),
          categoryId: data.categoryId,
          imageUrl: data.imageUrl,
          imageKey: data.imageKey,
          imageCardUrl: data.imageCardUrl,
          imageCardKey: data.imageCardKey,
          imageThumbUrl: data.imageThumbUrl,
          imageThumbKey: data.imageThumbKey,
        } as any,
      });
      if (typeof data.stockQuantity === 'number' && data.stockQuantity !== product.stockQuantity) {
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            change: data.stockQuantity - product.stockQuantity,
            reason: 'ADJUSTMENT',
          },
        });
      }
      void this.touchCatalogCache();
      return updated;
    });
  }

  async updateByBusinessOwner(productId: string, userId: string, data: UpdateProductDto) {
    const business = await this.requireApprovedBusiness(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.businessId !== business.id) {
      throw new ForbiddenException('Bu mahsulot sizning do‘koningizga tegishli emas');
    }
    return this.updateByAdmin(productId, data);
  }

  async removeByBusinessOwner(productId: string, userId: string) {
    const business = await this.requireApprovedBusiness(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.businessId !== business.id) {
      throw new ForbiddenException('Bu mahsulot sizning do‘koningizga tegishli emas');
    }
    return this.removeByAdmin(productId);
  }

  async removeByAdmin(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    for (const key of [product.imageKey, product.imageCardKey, product.imageThumbKey]) {
      if (key) {
        await this.uploadService.deleteImage(key);
      }
    }
    const result = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
    void this.touchCatalogCache();
    return result;
  }
}
