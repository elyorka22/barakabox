import { api } from '@/lib/api';
import type { PaginatedProducts } from '@/lib/storefront-api';
import type { StorefrontProduct } from '@/types/storefront-product';

export type MarketplaceCatalogSort = 'newest' | 'price_asc' | 'price_desc';

export type FetchMarketplaceCatalogOpts = {
  page?: number;
  limit?: number;
  categoryId?: string;
  q?: string;
  sort?: MarketplaceCatalogSort;
  storeId?: string;
};

function buildQuery(opts: FetchMarketplaceCatalogOpts): string {
  const params = new URLSearchParams();
  params.set('page', String(opts.page ?? 1));
  params.set('limit', String(opts.limit ?? 24));
  if (opts.categoryId) params.set('categoryId', opts.categoryId);
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.storeId) params.set('storeId', opts.storeId);
  return params.toString();
}

export async function fetchMarketplaceCatalogPage(
  opts: FetchMarketplaceCatalogOpts = {},
): Promise<PaginatedProducts> {
  return api.get<PaginatedProducts>(`/marketplace/catalog?${buildQuery(opts)}`);
}

export async function fetchMarketplacePopular(limit = 12): Promise<{ items: StorefrontProduct[] }> {
  return api.get<{ items: StorefrontProduct[] }>(
    `/marketplace/catalog/popular?limit=${limit}`,
  );
}

export async function fetchMarketplacePromotionsPage(opts?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedProducts> {
  const params = new URLSearchParams();
  params.set('page', String(opts?.page ?? 1));
  params.set('limit', String(opts?.limit ?? 12));
  return api.get<PaginatedProducts>(`/marketplace/catalog/promotions?${params}`);
}
