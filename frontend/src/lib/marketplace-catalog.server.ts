import { getApiBaseUrl } from '@/lib/seo';
import type { FetchMarketplaceCatalogOpts } from '@/lib/marketplace-catalog';
import type { PaginatedProducts } from '@/lib/storefront-api';

const EMPTY: PaginatedProducts = {
  items: [],
  total: 0,
  page: 1,
  totalPages: 1,
  hasMore: false,
};

function buildQuery(opts: FetchMarketplaceCatalogOpts): string {
  const params = new URLSearchParams();
  params.set('page', String(opts.page ?? 1));
  params.set('limit', String(opts.limit ?? 24));
  if (opts.categoryId) params.set('categoryId', opts.categoryId);
  if (opts.sort) params.set('sort', opts.sort);
  return params.toString();
}

export async function fetchMarketplaceCatalogPageServer(
  opts: FetchMarketplaceCatalogOpts = {},
): Promise<PaginatedProducts> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketplace/catalog?${buildQuery(opts)}`, {
      next: { revalidate: 90 },
    });
    if (!res.ok) return EMPTY;
    const payload = (await res.json()) as PaginatedProducts;
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      total: payload.total ?? 0,
      page: payload.page ?? 1,
      totalPages: payload.totalPages ?? 1,
      hasMore: payload.hasMore ?? false,
    };
  } catch {
    return EMPTY;
  }
}
