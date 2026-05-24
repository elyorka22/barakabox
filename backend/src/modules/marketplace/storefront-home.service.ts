import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { mapStorefrontProduct, storefrontProductSelect } from '../products/storefront-product.mapper';
import {
  mapListingToStorefront,
  storefrontListingSelect,
} from './storefront-listing.mapper';
import { mapStoreCard, storeCardSelect, VISIBLE_STORE_LISTING_WHERE } from './store-card.mapper';
import { StorefrontStoresService } from './storefront-stores.service';
import { StorefrontMarketplaceCatalogService } from './storefront-marketplace-catalog.service';

const STOREFRONT_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  isActive: true,
  business: { isActive: true, status: 'APPROVED' },
};

const VISIBLE_LISTING_WHERE = VISIBLE_STORE_LISTING_WHERE;

@Injectable()
export class StorefrontHomeService {
  private static readonly TOP_LIMIT = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storefrontStores: StorefrontStoresService,
    private readonly marketplaceCatalog: StorefrontMarketplaceCatalogService,
  ) {}

  getHomepage() {
    return this.cache.getOrSet(cacheKeys.marketplaceHome(), CACHE_TTL.marketplaceHome, () =>
      this.buildHomepage(),
    );
  }

  listStores(opts?: { featured?: boolean }) {
    const featured = Boolean(opts?.featured);
    return this.cache.getOrSet(
      cacheKeys.marketplaceStores(featured),
      CACHE_TTL.marketplaceStores,
      () => this.fetchStores(featured),
    );
  }

  getStoreBySlug(slug: string) {
    const normalized = slug.trim();
    return this.cache.getOrSet(
      cacheKeys.marketplaceStore(normalized),
      CACHE_TTL.marketplaceStore,
      () => this.fetchStoreBySlug(normalized),
    );
  }

  private fetchStores(featured: boolean) {
    const where: Prisma.StoreWhereInput = { isActive: true };
    if (featured) where.isFeatured = true;

    return this.prisma.store
      .findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        select: storeCardSelect,
      })
      .then((rows) => rows.map(mapStoreCard));
  }

  private async fetchStoreBySlug(slug: string) {
    const detail = await this.storefrontStores.getStoreBySlug(slug);
    if (!detail) return null;

    const page = await this.storefrontStores.listStoreProducts(slug, {
      page: 1,
      limit: 48,
    });

    return {
      store: detail.store,
      categories: detail.categories,
      promotionCount: detail.promotionCount,
      products: page.items,
      productsMeta: {
        page: page.page,
        limit: page.limit,
        total: page.total,
        totalPages: page.totalPages,
      },
    };
  }

  private async buildHomepage() {
    const [legacyTopRows, marketplaceTopRows, storeShowcase, featuredStores, popularBlock, promotionsBlock] =
      await Promise.all([
      this.prisma.product.findMany({
        where: { ...STOREFRONT_PRODUCT_WHERE, isTopProduct: true },
        select: storefrontProductSelect,
        orderBy: [{ topOrder: 'asc' }, { updatedAt: 'desc' }],
        take: StorefrontHomeService.TOP_LIMIT,
      }),
      this.prisma.storeProduct.findMany({
        where: { ...VISIBLE_LISTING_WHERE, isTop: true },
        select: storefrontListingSelect,
        orderBy: [{ topOrder: 'asc' }, { updatedAt: 'desc' }],
        take: StorefrontHomeService.TOP_LIMIT,
      }),
      this.storefrontStores.getHomeShowcase(),
      this.prisma.store.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 10,
        select: storeCardSelect,
      }),
      this.marketplaceCatalog.listPopular(12),
      this.marketplaceCatalog.listPromotions({ page: 1, limit: 12 }),
    ]);

    const legacyTop = legacyTopRows.map((r) => mapStorefrontProduct(r));
    const marketplaceTop = marketplaceTopRows.map(mapListingToStorefront);
    const topProducts = this.mergeTopProducts(legacyTop, marketplaceTop);

    return {
      topProducts,
      featuredStores: featuredStores.map(mapStoreCard),
      marketplacePromotions: promotionsBlock.items,
      popularProducts: popularBlock.items,
      storeSections: [],
      storeShowcase,
    };
  }

  private mergeTopProducts(
    legacy: ReturnType<typeof mapStorefrontProduct>[],
    marketplace: ReturnType<typeof mapListingToStorefront>[],
  ) {
    const byId = new Map<string, Record<string, unknown>>();

    for (const item of marketplace) {
      byId.set(item.id, item);
    }
    for (const item of legacy) {
      byId.set(item.id, { ...item, purchasable: true });
    }

    return [...byId.values()]
      .sort((a, b) => Number(a.topOrder ?? 0) - Number(b.topOrder ?? 0))
      .slice(0, StorefrontHomeService.TOP_LIMIT);
  }
}
