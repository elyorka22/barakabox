import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StoreType } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  mapListingToStorefront,
  storefrontListingSelect,
} from './storefront-listing.mapper';
import {
  mapStoreCard,
  storeCardSelect,
  VISIBLE_STORE_LISTING_WHERE,
} from './store-card.mapper';

const ACTIVE_STORE_WHERE: Prisma.StoreWhereInput = {
  isActive: true,
  storeProducts: { some: VISIBLE_STORE_LISTING_WHERE },
};

const SECTION_LIMIT = 12;
const DEFAULT_PAGE_LIMIT = 24;

export type StoreListSection = 'featured' | 'new' | 'top' | 'nearby';

@Injectable()
export class StorefrontStoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  listFeatured() {
    return this.cache.getOrSet(cacheKeys.storesFeatured(), CACHE_TTL.storesFeatured, () =>
      this.fetchSection('featured', SECTION_LIMIT),
    );
  }

  getHomeShowcase() {
    return this.cache.getOrSet(cacheKeys.storesShowcase(), CACHE_TTL.storesShowcase, async () => {
      let nearby = await this.fetchSection('nearby', SECTION_LIMIT);
      if (nearby.length === 0) {
        const rows = await this.prisma.store.findMany({
          where: { isActive: true },
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
          take: SECTION_LIMIT,
          select: storeCardSelect,
        });
        nearby = rows.map(mapStoreCard);
      }
      return { nearby };
    });
  }

  listStores(opts?: {
    section?: StoreListSection;
    storeType?: StoreType;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
  }) {
    const section = opts?.section;
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts?.limit ?? DEFAULT_PAGE_LIMIT));
    const cacheKey = cacheKeys.storesList(
      section ?? opts?.storeType ?? 'all',
      page,
      limit,
      opts?.lat,
      opts?.lng,
    );

    return this.cache.getOrSet(cacheKey, CACHE_TTL.storesList, async () => {
      if (section) {
        const items = await this.fetchSection(section, limit, { lat: opts?.lat, lng: opts?.lng });
        return { items, page: 1, limit, total: items.length, totalPages: 1 };
      }

      const where: Prisma.StoreWhereInput = { ...ACTIVE_STORE_WHERE };
      if (opts?.storeType) where.storeType = opts.storeType;

      const skip = (page - 1) * limit;
      const [rows, total] = await Promise.all([
        this.prisma.store.findMany({
          where,
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
          skip,
          take: limit,
          select: storeCardSelect,
        }),
        this.prisma.store.count({ where }),
      ]);

      return {
        items: rows.map(mapStoreCard),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    });
  }

  getStoreBySlug(slug: string) {
    const normalized = slug.trim();
    return this.cache.getOrSet(
      cacheKeys.storeDetail(normalized),
      CACHE_TTL.storeDetail,
      () => this.fetchStoreDetail(normalized),
    );
  }

  listStoreProducts(
    slug: string,
    opts?: {
      page?: number;
      limit?: number;
      q?: string;
      categoryId?: string;
      promo?: boolean;
    },
  ) {
    const normalized = slug.trim();
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts?.limit ?? 24));
    const q = opts?.q?.trim() || undefined;
    const categoryId = opts?.categoryId?.trim() || undefined;
    const promo = Boolean(opts?.promo);
    const cacheKey = cacheKeys.storeProducts(
      normalized,
      page,
      limit,
      q,
      categoryId,
      promo,
    );

    return this.cache.getOrSet(cacheKey, CACHE_TTL.storeProducts, () =>
      this.fetchStoreProducts(normalized, { page, limit, q, categoryId, promo }),
    );
  }

  private async fetchSection(
    section: StoreListSection,
    take: number,
    geo?: { lat?: number; lng?: number },
  ) {
    const rows = await this.prisma.store.findMany({
      where: this.sectionWhere(section),
      orderBy: this.sectionOrderBy(section, geo),
      take,
      select: storeCardSelect,
    });
    return rows.map(mapStoreCard);
  }

  private sectionWhere(section: StoreListSection): Prisma.StoreWhereInput {
    const base = ACTIVE_STORE_WHERE;
    if (section === 'featured') {
      return { ...base, isFeatured: true };
    }
    return base;
  }

  private sectionOrderBy(
    section: StoreListSection,
    geo?: { lat?: number; lng?: number },
  ): Prisma.StoreOrderByWithRelationInput[] {
    if (section === 'new') {
      return [{ createdAt: 'desc' }];
    }
    if (section === 'top') {
      return [{ rating: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }];
    }
    if (section === 'nearby' && geo?.lat != null && geo?.lng != null) {
      return [{ sortOrder: 'asc' }, { name: 'asc' }];
    }
    if (section === 'featured') {
      return [{ sortOrder: 'asc' }, { name: 'asc' }];
    }
    return [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }];
  }

  private async fetchStoreDetail(slug: string) {
    const store = await this.prisma.store.findFirst({
      where: { slug, isActive: true },
      select: storeCardSelect,
    });
    if (!store) return null;

    const promotionCount = await this.prisma.storeProduct.count({
      where: {
        storeId: store.id,
        ...VISIBLE_STORE_LISTING_WHERE,
        oldPrice: { not: null },
      },
    });

    const categoryRows = await this.prisma.storeProduct.findMany({
      where: { storeId: store.id, ...VISIBLE_STORE_LISTING_WHERE },
      distinct: ['globalProductId'],
      select: {
        globalProduct: {
          select: {
            categoryId: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      take: 40,
    });

    const categoriesMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    for (const row of categoryRows) {
      const cat = row.globalProduct.category;
      if (cat) categoriesMap.set(cat.id, cat);
    }

    const card = mapStoreCard(store);
    return {
      store: card,
      promotionCount,
      categories: [...categoriesMap.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'uz'),
      ),
    };
  }

  private async fetchStoreProducts(
    slug: string,
    opts: {
      page: number;
      limit: number;
      q?: string;
      categoryId?: string;
      promo: boolean;
    },
  ) {
    const store = await this.prisma.store.findFirst({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (!store) throw new NotFoundException('Do‘kon topilmadi');

    const where: Prisma.StoreProductWhereInput = {
      storeId: store.id,
      ...VISIBLE_STORE_LISTING_WHERE,
    };

    if (opts.promo) {
      where.oldPrice = { not: null };
    }

    if (opts.categoryId) {
      where.globalProduct = {
        is: { isActive: true, categoryId: opts.categoryId },
      };
    }

    if (opts.q) {
      where.OR = [
        { globalProduct: { name: { contains: opts.q, mode: 'insensitive' } } },
        { globalProduct: { brand: { contains: opts.q, mode: 'insensitive' } } },
      ];
    }

    const skip = (opts.page - 1) * opts.limit;
    const [rows, total] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where,
        orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: opts.limit,
        select: storefrontListingSelect,
      }),
      this.prisma.storeProduct.count({ where }),
    ]);

    return {
      store: { id: store.id, name: store.name, slug: store.slug },
      items: rows.map(mapListingToStorefront),
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
    };
  }
}
