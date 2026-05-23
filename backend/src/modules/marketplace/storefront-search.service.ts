import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProductsService } from '../products/products.service';
import {
  mapListingToStorefront,
  storefrontListingSelect,
} from './storefront-listing.mapper';

const VISIBLE_LISTING_WHERE: Prisma.StoreProductWhereInput = {
  isVisible: true,
  stock: { gt: 0 },
  store: { isActive: true },
  globalProduct: { isActive: true },
};

@Injectable()
export class StorefrontSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Unified storefront search (PostgreSQL). Replace with Meilisearch when `SEARCH_PROVIDER=meilisearch`.
   */
  search(q: string, opts?: { page?: number; limit?: number }) {
    const term = q.trim();
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(48, Math.max(1, opts?.limit ?? 24));

    return this.cache.getOrSet(
      cacheKeys.marketplaceSearch(term, page, limit),
      CACHE_TTL.marketplaceSearch,
      () => this.executeSearch(term, page, limit),
    );
  }

  private async executeSearch(q: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const listingWhere: Prisma.StoreProductWhereInput = {
      ...VISIBLE_LISTING_WHERE,
      OR: [
        { globalProduct: { name: { contains: q, mode: 'insensitive' } } },
        { globalProduct: { brand: { contains: q, mode: 'insensitive' } } },
        { globalVariant: { value: { contains: q, mode: 'insensitive' } } },
      ],
    };

    const [legacyProducts, listingRows, listingTotal, stores, categories] = await Promise.all([
      this.productsService.listPaginated({ search: q, page, limit, sort: 'newest' }),
      this.prisma.storeProduct.findMany({
        where: listingWhere,
        skip,
        take: limit,
        orderBy: [{ isTop: 'desc' }, { topOrder: 'asc' }, { createdAt: 'desc' }],
        select: storefrontListingSelect,
      }),
      this.prisma.storeProduct.count({ where: listingWhere }),
      this.prisma.store.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
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
      this.prisma.category.findMany({
        where: {
          isActive: true,
          slug: { not: 'all' },
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      }),
    ]);

    const listings = listingRows.map(mapListingToStorefront);
    const listingTotalPages = Math.max(1, Math.ceil(listingTotal / limit));

    return {
      q,
      provider: 'postgres' as const,
      legacyProducts,
      listings: {
        items: listings,
        total: listingTotal,
        page,
        limit,
        totalPages: listingTotalPages,
        hasMore: page < listingTotalPages,
      },
      stores,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        href: `/categories/${c.slug}`,
      })),
    };
  }
}
