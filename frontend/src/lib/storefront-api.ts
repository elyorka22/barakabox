import { api } from '@/lib/api';
import type { StorefrontProduct } from '@/types/storefront-product';

export type PaginatedProducts = {
  items: StorefrontProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type HomepageSections = {
  discounted: StorefrontProduct[];
  popular: StorefrontProduct[];
  recommended: StorefrontProduct[];
  catalogVersion: number;
};

export async function fetchHomepageSections(): Promise<HomepageSections> {
  return api.get<HomepageSections>('/products/home');
}

export async function fetchProductsPage(opts: {
  page?: number;
  limit?: number;
  categoryId?: string;
  sort?: string;
  q?: string;
}): Promise<PaginatedProducts> {
  const params = new URLSearchParams();
  params.set('page', String(opts.page ?? 1));
  params.set('limit', String(opts.limit ?? 24));
  if (opts.categoryId) params.set('categoryId', opts.categoryId);
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.q?.trim()) params.set('q', opts.q.trim());
  return api.get<PaginatedProducts>(`/products?${params.toString()}`);
}
