import { api } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/seo';
import type { StorefrontProduct } from '@/types/storefront-product';

export type FeaturedStore = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  deliveryPrice: number;
  minOrderPrice: number;
};

export type StoreSection = {
  store: { id: string; name: string; slug: string; logoUrl: string | null };
  products: StorefrontProduct[];
};

export type MarketplaceHome = {
  topProducts: StorefrontProduct[];
  featuredStores: FeaturedStore[];
  marketplacePromotions: StorefrontProduct[];
  storeSections: StoreSection[];
};

export async function fetchMarketplaceHome(): Promise<MarketplaceHome> {
  return api.get<MarketplaceHome>('/marketplace/home');
}

export type StorePageData = {
  store: FeaturedStore & { address: string | null; phone: string | null };
  products: StorefrontProduct[];
};

export async function fetchStoreBySlug(slug: string): Promise<StorePageData> {
  return api.get<StorePageData>(`/marketplace/stores/${encodeURIComponent(slug)}`);
}

const EMPTY_HOME: MarketplaceHome = {
  topProducts: [],
  featuredStores: [],
  marketplacePromotions: [],
  storeSections: [],
};

export async function fetchMarketplaceHomeServer(): Promise<MarketplaceHome> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketplace/home`, { next: { revalidate: 120 } });
    if (!res.ok) return EMPTY_HOME;
    return (await res.json()) as MarketplaceHome;
  } catch {
    return EMPTY_HOME;
  }
}

export async function fetchStoresServer(): Promise<FeaturedStore[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketplace/stores`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return (await res.json()) as FeaturedStore[];
  } catch {
    return [];
  }
}

export async function fetchStoreBySlugServer(slug: string): Promise<StorePageData | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketplace/stores/${encodeURIComponent(slug)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return (await res.json()) as StorePageData;
  } catch {
    return null;
  }
}
