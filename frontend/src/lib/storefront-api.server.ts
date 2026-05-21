import { getApiBaseUrl } from '@/lib/seo';
import type { FetchProductsOpts, PaginatedProducts } from '@/lib/storefront-api';

function buildProductsQuery(opts: FetchProductsOpts): string {
  const params = new URLSearchParams();
  params.set('page', String(opts.page ?? 1));
  params.set('limit', String(opts.limit ?? 24));
  if (opts.categoryId) params.set('categoryId', opts.categoryId);
  if (opts.businessId) params.set('businessId', opts.businessId);
  if (opts.search?.trim()) params.set('search', opts.search.trim());
  if (opts.sort) params.set('sort', opts.sort);
  return params.toString();
}

const EMPTY_CATALOG: PaginatedProducts = {
  items: [],
  total: 0,
  page: 1,
  totalPages: 1,
  hasMore: false,
};

/** Server-side catalog fetch for RSC homepage (initial page only). */
export async function fetchProductsPageServer(
  opts: FetchProductsOpts = {},
): Promise<PaginatedProducts> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/products?${buildProductsQuery(opts)}`, {
      next: { revalidate: 90 },
    });
    if (!response.ok) return EMPTY_CATALOG;
    const payload = (await response.json()) as PaginatedProducts;
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      total: payload.total ?? 0,
      page: payload.page ?? 1,
      totalPages: payload.totalPages ?? 1,
      hasMore: payload.hasMore ?? false,
    };
  } catch {
    return EMPTY_CATALOG;
  }
}
