import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashbackType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isStoreOperatorRole, normalizeRole } from '../../common/roles';
import { throwMappedPrismaError } from '../../common/utils/prisma-errors';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CreateStoreListingDto, UpdateStoreListingDto } from './dto/global-catalog.dto';
import { StoreContextService } from './store-context.service';

const listingSelect = {
  id: true,
  storeId: true,
  globalProductId: true,
  globalVariantId: true,
  price: true,
  oldPrice: true,
  stock: true,
  cashbackType: true,
  cashbackValue: true,
  isVisible: true,
  isTop: true,
  topOrder: true,
  createdAt: true,
  updatedAt: true,
  globalProduct: {
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      imageUrl: true,
      imageThumbUrl: true,
      category: { select: { id: true, name: true } },
    },
  },
  globalVariant: {
    select: { id: true, type: true, value: true, imageUrl: true },
  },
} satisfies Prisma.StoreProductSelect;

@Injectable()
export class StoreCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeContext: StoreContextService,
    private readonly cache: CacheService,
  ) {}

  private touchStorefrontCache(storeSlug?: string) {
    void this.cache.invalidateMarketplaceStorefront(storeSlug);
  }

  async resolveStoreForOperator(userId: string, role: string) {
    const r = normalizeRole(role);
    if (!isStoreOperatorRole(r)) {
      throw new ForbiddenException('Faqat do‘kon operatori uchun');
    }
    if (r === 'STORE_OWNER') {
      return this.storeContext.requireOwnedStore(userId);
    }
    const store = await this.prisma.store.findFirst({
      where: { businessProfile: { userId }, isActive: true },
    });
    if (!store) {
      throw new ForbiddenException(
        'Marketplace do‘koni ulanmagan. Admin global katalogdan do‘konni bog‘lashi kerak.',
      );
    }
    return store;
  }

  async browseGlobalCatalog(
    storeId: string,
    opts?: { q?: string; categoryId?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();

    const where: Prisma.GlobalProductWhereInput = { isActive: true };
    if (opts?.categoryId) where.categoryId = opts.categoryId;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, total, existingListings] = await Promise.all([
      this.prisma.globalProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          unit: true,
          imageUrl: true,
          imageThumbUrl: true,
          description: true,
          category: { select: { id: true, name: true } },
          variants: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
            select: {
              id: true,
              type: true,
              value: true,
              imageUrl: true,
              sku: true,
            },
          },
        },
      }),
      this.prisma.globalProduct.count({ where }),
      this.prisma.storeProduct.findMany({
        where: { storeId },
        select: { globalProductId: true, globalVariantId: true },
      }),
    ]);

    const listedKeys = new Set(
      existingListings.map((l) =>
        l.globalVariantId ? `${l.globalProductId}:${l.globalVariantId}` : `${l.globalProductId}:`,
      ),
    );

    const items = products.map((p) => {
      const hasVariants = p.variants.length > 0;
      const variants = p.variants.map((v) => ({
        ...v,
        alreadyListed: listedKeys.has(`${p.id}:${v.id}`),
      }));
      const baseListed = !hasVariants && listedKeys.has(`${p.id}:`);
      return {
        ...p,
        hasVariants,
        alreadyListed: hasVariants ? variants.every((v) => v.alreadyListed) : baseListed,
        variants,
      };
    });

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  listStoreListings(storeId: string) {
    return this.prisma.storeProduct.findMany({
      where: { storeId },
      orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
      select: listingSelect,
    });
  }

  private async assertListingTarget(
    globalProductId: string,
    globalVariantId: string | null | undefined,
  ) {
    const product = await this.prisma.globalProduct.findUnique({
      where: { id: globalProductId },
      include: {
        variants: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Global mahsulot topilmadi yoki faol emas');
    }

    const activeVariants = product.variants;
    if (activeVariants.length > 0) {
      if (!globalVariantId) {
        throw new BadRequestException('Bu mahsulot uchun variant tanlang');
      }
      if (!activeVariants.some((v) => v.id === globalVariantId)) {
        throw new BadRequestException('Variant ushbu mahsulotga tegishli emas');
      }
      return;
    }

    if (globalVariantId) {
      throw new BadRequestException('Bu mahsulotda variant yo‘q');
    }
  }

  async createListing(storeId: string, dto: CreateStoreListingDto) {
    await this.assertListingTarget(dto.globalProductId, dto.globalVariantId ?? null);

    const variantId = dto.globalVariantId?.trim() || null;

    const duplicate = await this.prisma.storeProduct.findFirst({
      where: {
        storeId,
        globalProductId: dto.globalProductId,
        globalVariantId: variantId,
      },
    });
    if (duplicate) {
      throw new ConflictException('Bu mahsulot allaqachon do‘konda mavjud');
    }

    try {
      const created = await this.prisma.storeProduct.create({
        data: {
          storeId,
          globalProductId: dto.globalProductId,
          globalVariantId: variantId,
          price: dto.price,
          oldPrice: dto.oldPrice ?? null,
          stock: dto.stock ?? 0,
          cashbackType: dto.cashbackType ?? CashbackType.NONE,
          cashbackValue: dto.cashbackValue ?? 0,
          isVisible: dto.isVisible ?? true,
        },
        select: listingSelect,
      });
      const storeRow = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { slug: true },
      });
      this.touchStorefrontCache(storeRow?.slug);
      return created;
    } catch (error) {
      throwMappedPrismaError(error, 'createStoreListing');
      throw error;
    }
  }

  async updateListing(storeId: string, listingId: string, dto: UpdateStoreListingDto) {
    const listing = await this.prisma.storeProduct.findUnique({ where: { id: listingId } });
    if (!listing || listing.storeId !== storeId) {
      throw new NotFoundException('Listing topilmadi');
    }

    const updated = await this.prisma.storeProduct.update({
      where: { id: listingId },
      data: {
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.oldPrice !== undefined ? { oldPrice: dto.oldPrice } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.cashbackType !== undefined ? { cashbackType: dto.cashbackType } : {}),
        ...(dto.cashbackValue !== undefined ? { cashbackValue: dto.cashbackValue } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.isTop !== undefined ? { isTop: dto.isTop } : {}),
        ...(dto.topOrder !== undefined ? { topOrder: dto.topOrder } : {}),
      },
      select: listingSelect,
    });
    const storeRow = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { slug: true },
    });
    this.touchStorefrontCache(storeRow?.slug);
    return updated;
  }
}
