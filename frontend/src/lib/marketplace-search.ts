import { api } from '@/lib/api';
import type { FeaturedStore } from '@/lib/marketplace-home';
import type { PaginatedProducts } from '@/lib/storefront-api';
import type { StorefrontProduct } from '@/types/storefront-product';

export type SearchCategoryHit = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  href: string;
};

export type MarketplaceSearchResult = {
  q: string;
  provider: 'postgres';
  legacyProducts: PaginatedProducts;
  listings: {
    items: StorefrontProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  stores: FeaturedStore[];
  categories: SearchCategoryHit[];
};

export async function fetchMarketplaceSearch(opts: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<MarketplaceSearchResult> {
  const params = new URLSearchParams();
  params.set('q', opts.q.trim());
  params.set('page', String(opts.page ?? 1));
  params.set('limit', String(opts.limit ?? 24));
  return api.get<MarketplaceSearchResult>(`/marketplace/search?${params.toString()}`);
}
