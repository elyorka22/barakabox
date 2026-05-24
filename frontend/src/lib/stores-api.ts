import { api } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/seo';
import type { StorefrontProduct } from '@/types/storefront-product';

export type StoreCard = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  deliveryTime: number | null;
  deliveryTimeMinutes: number | null;
  rating: number;
  productCount: number;
  deliveryPrice: number;
  minOrderPrice: number;
  sortOrder?: number;
  createdAt?: string;
};

export type StoreShowcase = {
  nearby: StoreCard[];
};

export type StoreDetailResponse = {
  store: StoreCard;
  promotionCount: number;
  categories: { id: string; name: string; slug: string }[];
};

export type StoreProductsPage = {
  store: { id: string; name: string; slug: string };
  items: StorefrontProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StoresListResponse = {
  items: StoreCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function fetchStoresFeatured(): Promise<StoreCard[]> {
  return api.get<StoreCard[]>('/stores/featured');
}

export async function fetchStoresList(params?: {
  section?: 'featured' | 'new' | 'top' | 'nearby';
  page?: number;
  limit?: number;
}): Promise<StoresListResponse> {
  const q = new URLSearchParams();
  if (params?.section) q.set('section', params.section);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const suffix = q.toString() ? `?${q}` : '';
  return api.get<StoresListResponse>(`/stores${suffix}`);
}

export async function fetchStoreDetail(slug: string): Promise<StoreDetailResponse> {
  return api.get<StoreDetailResponse>(`/stores/${encodeURIComponent(slug)}`);
}

export async function fetchStoreProducts(
  slug: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
    categoryId?: string;
    promo?: boolean;
  },
): Promise<StoreProductsPage> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.q) q.set('q', params.q);
  if (params?.categoryId) q.set('categoryId', params.categoryId);
  if (params?.promo) q.set('promo', '1');
  const suffix = q.toString() ? `?${q}` : '';
  return api.get<StoreProductsPage>(
    `/stores/${encodeURIComponent(slug)}/products${suffix}`,
  );
}

export async function fetchStoresListServer(params?: {
  section?: 'featured' | 'new' | 'top' | 'nearby';
  page?: number;
  limit?: number;
}): Promise<StoresListResponse> {
  const empty: StoresListResponse = {
    items: [],
    page: 1,
    limit: params?.limit ?? 24,
    total: 0,
    totalPages: 1,
  };
  try {
    const q = new URLSearchParams();
    if (params?.section) q.set('section', params.section);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const suffix = q.toString() ? `?${q}` : '';
    const res = await fetch(`${getApiBaseUrl()}/stores${suffix}`, {
      next: { revalidate: 180 },
    });
    if (!res.ok) return empty;
    return (await res.json()) as StoresListResponse;
  } catch {
    return empty;
  }
}

export async function fetchStoreDetailServer(slug: string): Promise<StoreDetailResponse | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/stores/${encodeURIComponent(slug)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return (await res.json()) as StoreDetailResponse;
  } catch {
    return null;
  }
}

export async function fetchStoreProductsServer(
  slug: string,
  params?: { page?: number; limit?: number },
): Promise<StoreProductsPage | null> {
  try {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const suffix = q.toString() ? `?${q}` : '';
    const res = await fetch(
      `${getApiBaseUrl()}/stores/${encodeURIComponent(slug)}/products${suffix}`,
      { next: { revalidate: 90 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as StoreProductsPage;
  } catch {
    return null;
  }
}

export function formatDeliveryTime(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} daq`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} soat ${m} daq` : `${h} soat`;
}
