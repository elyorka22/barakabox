import { api } from '@/lib/api';
import type { StorefrontProduct } from '@/types/storefront-product';

export type PaginatedProducts = {
  items: StorefrontProduct[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
};

export type HomepageSections = {
  discounted: StorefrontProduct[];
  popular: StorefrontProduct[];
  recommended: StorefrontProduct[];
  catalogVersion: number;
};

export type FetchProductsOpts = {
  page?: number;
  limit?: number;
  categoryId?: string;
  businessId?: string;
  search?: string;
  sort?: string;
};

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

export async function fetchHomepageSections(): Promise<HomepageSections> {
  return api.get<HomepageSections>('/products/home');
}

export async function fetchProductsPage(opts: FetchProductsOpts = {}): Promise<PaginatedProducts> {
  return api.get<PaginatedProducts>(`/products?${buildProductsQuery(opts)}`);
}
