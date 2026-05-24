import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  mapListingToStorefront,
  storefrontListingSelect,
} from './storefront-listing.mapper';
import { VISIBLE_STORE_LISTING_WHERE } from './store-card.mapper';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

export type MarketplaceCatalogSort = 'newest' | 'price_asc' | 'price_desc';

@Injectable()
export class StorefrontMarketplaceCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  listCatalog(opts?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    q?: string;
    sort?: MarketplaceCatalogSort;
    storeId?: string;
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, opts?.limit ?? DEFAULT_LIMIT));
    const sort = opts?.sort ?? 'newest';
    const q = opts?.q?.trim() || undefined;
    const categoryId = opts?.categoryId?.trim() || undefined;
    const storeId = opts?.storeId?.trim() || undefined;

    const cacheKey = cacheKeys.marketplaceCatalog(
      page,
      limit,
      categoryId,
      q,
      sort,
      storeId,
    );

    return this.cache.getOrSet(cacheKey, CACHE_TTL.marketplaceCatalog, () =>
      this.fetchCatalog({ page, limit, categoryId, q, sort, storeId }),
    );
  }

  listPopular(limit = 12) {
    const take = Math.min(24, Math.max(1, limit));
    return this.cache.getOrSet(cacheKeys.marketplacePopular(take), CACHE_TTL.marketplacePopular, () =>
      this.fetchPopular(take),
    );
  }

  listPromotions(opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, opts?.limit ?? 12));
    return this.cache.getOrSet(
      cacheKeys.marketplacePromotions(page, limit),
      CACHE_TTL.marketplacePromotions,
      () => this.fetchPromotions(page, limit),
    );
  }

  private listingWhere(
    extra?: Prisma.StoreProductWhereInput,
  ): Prisma.StoreProductWhereInput {
    return { ...VISIBLE_STORE_LISTING_WHERE, ...extra };
  }

  private orderBy(sort: MarketplaceCatalogSort): Prisma.StoreProductOrderByWithRelationInput[] {
    if (sort === 'price_asc') return [{ price: 'asc' }, { createdAt: 'desc' }];
    if (sort === 'price_desc') return [{ price: 'desc' }, { createdAt: 'desc' }];
    return [{ createdAt: 'desc' }];
  }

  private async fetchCatalog(opts: {
    page: number;
    limit: number;
    categoryId?: string;
    q?: string;
    sort: MarketplaceCatalogSort;
    storeId?: string;
  }) {
    const where = this.listingWhere();

    if (opts.storeId) where.storeId = opts.storeId;

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
        orderBy: this.orderBy(opts.sort),
        skip,
        take: opts.limit,
        select: storefrontListingSelect,
      }),
      this.prisma.storeProduct.count({ where }),
    ]);

    const items = rows.map(mapListingToStorefront);
    const totalPages = Math.max(1, Math.ceil(total / opts.limit));

    return {
      items,
      total,
      page: opts.page,
      totalPages,
      hasMore: opts.page < totalPages,
    };
  }

  private async fetchPopular(limit: number) {
    const rows = await this.prisma.storeProduct.findMany({
      where: {
        ...VISIBLE_STORE_LISTING_WHERE,
        globalProduct: { isActive: true, isPopular: true },
      },
      orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      select: storefrontListingSelect,
    });

    return { items: rows.map(mapListingToStorefront) };
  }

  private async fetchPromotions(page: number, limit: number) {
    const where = this.listingWhere({ oldPrice: { not: null } });
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: limit,
        select: storefrontListingSelect,
      }),
      this.prisma.storeProduct.count({ where }),
    ]);

    const items = rows
      .map(mapListingToStorefront)
      .filter((p) => p.discountEnabled && (p.discountPercent ?? 0) > 0);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }
}
