import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StoreCatalogService } from '../marketplace/store-catalog.service';
import { UpdateStoreTopItemDto } from '../marketplace/dto/store-panel.dto';
import { UpdateStoreProfileDto } from '../marketplace/dto/store-profile.dto';
import { StoreAdminService, type StoreMediaKind } from '../marketplace/store-admin.service';
import { BusinessDashboardService } from './business-dashboard.service';

const LOW_STOCK_THRESHOLD = 5;

export const storeListingShape = {
  id: true,
  price: true,
  oldPrice: true,
  stock: true,
  cashbackType: true,
  cashbackValue: true,
  isVisible: true,
  isTop: true,
  topOrder: true,
  globalProduct: {
    select: {
      id: true,
      name: true,
      brand: true,
      imageThumbUrl: true,
      imageUrl: true,
      category: { select: { id: true, name: true } },
    },
  },
  globalVariant: {
    select: { id: true, type: true, value: true },
  },
} satisfies Prisma.StoreProductSelect;

type ListingRow = Prisma.StoreProductGetPayload<{ select: typeof storeListingShape }>;

@Injectable()
export class StorePanelService {
  static readonly MAX_TOP_LISTINGS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storeCatalog: StoreCatalogService,
    private readonly storeAdmin: StoreAdminService,
    private readonly businessDashboard: BusinessDashboardService,
    private readonly cache: CacheService,
  ) {}

  private storeProfileSelect = {
    id: true,
    name: true,
    slug: true,
    logoUrl: true,
    bannerUrl: true,
    description: true,
    address: true,
    phone: true,
    storeType: true,
    deliveryTimeMinutes: true,
    deliveryPrice: true,
    minOrderPrice: true,
  } satisfies Prisma.StoreSelect;

  private labelListing(row: ListingRow) {
    const base = row.globalProduct.name;
    const variant = row.globalVariant?.value;
    return variant ? `${base} (${variant})` : base;
  }

  async getStoreContext(userId: string, role: string) {
    try {
      const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
      const listingCount = await this.prisma.storeProduct.count({
        where: { storeId: store.id },
      });
      const full = await this.prisma.store.findUnique({
        where: { id: store.id },
        select: this.storeProfileSelect,
      });
      return {
        available: true as const,
        store: { ...full!, listingCount },
      };
    } catch {
      return { available: false as const, store: null };
    }
  }

  async getOnboardingStatus(userId: string, role: string) {
    const ctx = await this.getStoreContext(userId, role);
    if (!ctx.available || !ctx.store) {
      return { available: false, complete: false, steps: null };
    }
    const s = ctx.store;
    const profileDone = Boolean(s.name?.trim() && s.address?.trim());
    const logoDone = Boolean(s.logoUrl);
    const productsDone = (s.listingCount ?? 0) > 0;
    return {
      available: true,
      complete: profileDone && logoDone && productsDone,
      listingCount: s.listingCount ?? 0,
      steps: {
        profile: profileDone,
        branding: logoDone,
        products: productsDone,
      },
    };
  }

  async updateStoreProfile(userId: string, role: string, dto: UpdateStoreProfileDto) {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.storeType !== undefined ? { storeType: dto.storeType } : {}),
        ...(dto.deliveryTimeMinutes !== undefined
          ? { deliveryTimeMinutes: dto.deliveryTimeMinutes }
          : {}),
      },
      select: this.storeProfileSelect,
    });
    void this.cache.invalidateMarketplaceStorefront(updated.slug);
    const listingCount = await this.prisma.storeProduct.count({ where: { storeId: store.id } });
    return { store: { ...updated, listingCount } };
  }

  async uploadStoreImage(
    userId: string,
    role: string,
    kind: StoreMediaKind,
    file: Express.Multer.File,
  ) {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
    return this.storeAdmin.uploadStoreImage(store.id, kind, file);
  }

  async getDashboard(userId: string, role: string) {
    const storeCtx = await this.getStoreContext(userId, role);

    let legacy: Awaited<ReturnType<BusinessDashboardService['getDashboard']>> | null = null;
    try {
      legacy = await this.businessDashboard.getDashboard(userId);
    } catch {
      legacy = null;
    }

    if (!storeCtx.available) {
      return {
        store: null,
        marketplace: null,
        legacy,
      };
    }

    const storeId = storeCtx.store.id;
    const [totalListings, visibleListings, topCount, teamCount, lowStock, outOfStock] =
      await Promise.all([
        this.prisma.storeProduct.count({ where: { storeId } }),
        this.prisma.storeProduct.count({ where: { storeId, isVisible: true } }),
        this.prisma.storeProduct.count({ where: { storeId, isTop: true } }),
        this.prisma.user.count({
          where: {
            storeScopeId: storeId,
            role: { in: ['PICKER', 'COURIER'] },
            isActive: true,
          },
        }),
        this.prisma.storeProduct.findMany({
          where: { storeId, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
          orderBy: { stock: 'asc' },
          take: 8,
          select: storeListingShape,
        }),
        this.prisma.storeProduct.findMany({
          where: { storeId, stock: { lte: 0 } },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: storeListingShape,
        }),
      ]);

    const [lowStockCount, outOfStockCount] = await Promise.all([
      this.prisma.storeProduct.count({
        where: { storeId, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
      }),
      this.prisma.storeProduct.count({ where: { storeId, stock: { lte: 0 } } }),
    ]);

    return {
      store: storeCtx.store,
      marketplace: {
        kpis: {
          totalListings,
          visibleListings,
          hiddenListings: totalListings - visibleListings,
          lowStockCount,
          outOfStockCount,
          topCount,
          teamCount,
        },
        inventory: {
          lowStock: lowStock.map((r) => ({
            id: r.id,
            name: this.labelListing(r),
            stock: r.stock,
            imageUrl: r.globalProduct.imageThumbUrl ?? r.globalProduct.imageUrl,
          })),
          outOfStock: outOfStock.map((r) => ({
            id: r.id,
            name: this.labelListing(r),
            stock: r.stock,
            imageUrl: r.globalProduct.imageThumbUrl ?? r.globalProduct.imageUrl,
          })),
        },
      },
      legacy,
    };
  }

  async listListings(
    userId: string,
    role: string,
    opts?: { q?: string; visible?: 'all' | 'visible' | 'hidden' },
  ) {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
    const q = opts?.q?.trim();

    const where: Prisma.StoreProductWhereInput = { storeId: store.id };
    if (opts?.visible === 'visible') where.isVisible = true;
    if (opts?.visible === 'hidden') where.isVisible = false;
    if (q) {
      where.OR = [
        { globalProduct: { name: { contains: q, mode: 'insensitive' } } },
        { globalProduct: { brand: { contains: q, mode: 'insensitive' } } },
        { globalVariant: { value: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.storeProduct.findMany({
      where,
      orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
      select: storeListingShape,
    });
  }

  async getInventory(userId: string, role: string) {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);

    const [lowStock, outOfStock] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where: { storeId: store.id, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
        orderBy: { stock: 'asc' },
        select: storeListingShape,
      }),
      this.prisma.storeProduct.findMany({
        where: { storeId: store.id, stock: { lte: 0 } },
        orderBy: { updatedAt: 'desc' },
        select: storeListingShape,
      }),
    ]);

    return { lowStock, outOfStock, threshold: LOW_STOCK_THRESHOLD };
  }

  async getTopListings(userId: string, role: string) {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
    return this.prisma.storeProduct.findMany({
      where: { storeId: store.id },
      orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
      select: storeListingShape,
    });
  }

  async updateTopListings(userId: string, role: string, items: UpdateStoreTopItemDto[]) {
    const store = await this.storeCatalog.resolveStoreForOperator(userId, role);
    const topItems = items.filter((i) => i.isTop);
    if (topItems.length > StorePanelService.MAX_TOP_LISTINGS) {
      throw new BadRequestException(
        `Eng ko‘pi bilan ${StorePanelService.MAX_TOP_LISTINGS} ta top mahsulot`,
      );
    }

    const ids = items.map((i) => i.id);
    const rows = await this.prisma.storeProduct.findMany({
      where: { id: { in: ids }, storeId: store.id },
      select: { id: true },
    });
    if (rows.length !== ids.length) {
      throw new NotFoundException('Baʼzi listinglar topilmadi');
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.storeProduct.update({
          where: { id: item.id },
          data: { isTop: item.isTop, topOrder: item.isTop ? item.topOrder : 0 },
        }),
      ),
    );

    const storeRow = await this.prisma.store.findUnique({
      where: { id: store.id },
      select: { slug: true },
    });
    void this.cache.invalidateMarketplaceStorefront(storeRow?.slug);

    return this.getTopListings(userId, role);
  }
}
