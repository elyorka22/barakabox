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

const STOREFRONT_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  isActive: true,
  business: { isActive: true, status: 'APPROVED' },
};

const VISIBLE_LISTING_WHERE: Prisma.StoreProductWhereInput = {
  isVisible: true,
  stock: { gt: 0 },
  store: { isActive: true },
  globalProduct: { isActive: true },
};

@Injectable()
export class StorefrontHomeService {
  private static readonly TOP_LIMIT = 15;
  private static readonly STORE_SECTION_LIMIT = 4;
  private static readonly LISTINGS_PER_STORE = 8;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
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

    return this.prisma.store.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        bannerUrl: true,
        deliveryPrice: true,
        minOrderPrice: true,
        address: true,
        _count: { select: { storeProducts: { where: VISIBLE_LISTING_WHERE } } },
      },
    });
  }

  private async fetchStoreBySlug(slug: string) {
    const store = await this.prisma.store.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        bannerUrl: true,
        address: true,
        phone: true,
        deliveryPrice: true,
        minOrderPrice: true,
      },
    });
    if (!store) return null;

    const listings = await this.prisma.storeProduct.findMany({
      where: { storeId: store.id, ...VISIBLE_LISTING_WHERE },
      orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
      select: storefrontListingSelect,
    });

    return {
      store,
      products: listings.map(mapListingToStorefront),
    };
  }

  private async buildHomepage() {
    const [
      legacyTopRows,
      marketplaceTopRows,
      featuredStores,
      promoListings,
      sectionStores,
    ] = await Promise.all([
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
      this.prisma.store.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          bannerUrl: true,
          deliveryPrice: true,
          minOrderPrice: true,
        },
      }),
      this.prisma.storeProduct.findMany({
        where: {
          ...VISIBLE_LISTING_WHERE,
          oldPrice: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 16,
        select: storefrontListingSelect,
      }),
      this.prisma.store.findMany({
        where: {
          isActive: true,
          storeProducts: { some: VISIBLE_LISTING_WHERE },
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        take: StorefrontHomeService.STORE_SECTION_LIMIT,
        select: { id: true, name: true, slug: true, logoUrl: true },
      }),
    ]);

    const legacyTop = legacyTopRows.map((r) => mapStorefrontProduct(r));
    const marketplaceTop = marketplaceTopRows.map(mapListingToStorefront);
    const topProducts = this.mergeTopProducts(legacyTop, marketplaceTop);

    const marketplacePromotions = promoListings
      .map(mapListingToStorefront)
      .filter((p) => p.discountEnabled && (p.discountPercent ?? 0) > 0)
      .slice(0, 12);

    const storeSections = await Promise.all(
      sectionStores.map(async (store) => {
        const listings = await this.prisma.storeProduct.findMany({
          where: { storeId: store.id, ...VISIBLE_LISTING_WHERE },
          orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
          take: StorefrontHomeService.LISTINGS_PER_STORE,
          select: storefrontListingSelect,
        });
        return {
          store,
          products: listings.map(mapListingToStorefront),
        };
      }),
    );

    return {
      topProducts,
      featuredStores,
      marketplacePromotions,
      storeSections: storeSections.filter((s) => s.products.length > 0),
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
