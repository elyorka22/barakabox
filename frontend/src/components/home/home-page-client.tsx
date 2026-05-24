'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronDown, Heart, Search } from 'lucide-react';
import { guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { HomeBannerCarousel } from '@/components/home/home-banner-carousel';
import { CatalogInfiniteGrid, type CatalogSource } from '@/components/home/catalog-infinite-grid';
import { PopularProductsCarousel } from '@/components/home/popular-products-carousel';
import { HomeInstallCard } from '@/components/pwa/HomeInstallCard';
import {
  fetchHomepageSections,
  fetchPromotionsPage,
  fetchTopProducts,
  type PaginatedProducts,
} from '@/lib/storefront-api';
import { fetchMarketplaceHome } from '@/lib/marketplace-home';
import { TopProductsCarousel } from '@/components/home/top-products-carousel';
import { HomeStoreTypes } from '@/components/home/home-store-types';
import { FeaturedStoresCarousel } from '@/components/home/featured-stores-carousel';
import { HomeDiscountedCarousel } from '@/components/home/home-discounted-carousel';
import { HomeCategoriesRow } from '@/components/home/home-categories-row';
import { HomeDeliveryBanner } from '@/components/home/home-delivery-banner';
import type { StoreCard } from '@/lib/stores-api';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';
import { hasVisibleDiscount } from '@/lib/promotion-product';

type Props = {
  initialCatalog: PaginatedProducts;
  catalogSource?: CatalogSource;
  initialStores?: StoreCard[];
  marketplaceEnabled?: boolean;
};

export function HomePageClient({
  initialCatalog,
  catalogSource = 'legacy',
  initialStores = [],
  marketplaceEnabled = false,
}: Props) {
  const { openProduct, registerCatalog } = useProductSheet();
  const [promoProducts, setPromoProducts] = useState<StorefrontProduct[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [topProducts, setTopProducts] = useState<StorefrontProduct[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);
  const [featuredStores, setFeaturedStores] = useState<StoreCard[]>(initialStores);
  const [loadingStores, setLoadingStores] = useState(initialStores.length === 0);
  const [popularProducts, setPopularProducts] = useState<StorefrontProduct[]>([]);
  const [marketplacePromos, setMarketplacePromos] = useState<StorefrontProduct[]>([]);
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  const discountedProducts = marketplaceEnabled
    ? promoProducts.length > 0
      ? promoProducts
      : marketplacePromos
    : promoProducts;

  const loadPromotions = useCallback(async () => {
    setLoadingPromos(true);
    try {
      const data = await fetchPromotionsPage({ page: 1, limit: 12, sort: 'discount_desc' });
      const items = data.items.filter(hasVisibleDiscount);
      setPromoProducts(items);
      if (items.length > 0) {
        registerCatalog([...initialCatalog.items, ...items]);
      }
    } catch {
      setPromoProducts([]);
    } finally {
      setLoadingPromos(false);
    }
  }, [initialCatalog.items, registerCatalog]);

  useEffect(() => {
    guestStorage.getGuestId();
    registerCatalog(initialCatalog.items);
    void loadPromotions();
  }, [initialCatalog.items, registerCatalog, loadPromotions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(() => setShowDeferredSections(true), { timeout: 180 })
      : window.setTimeout(() => setShowDeferredSections(true), 120);
    return () => {
      if (typeof id === 'number' && window.cancelIdleCallback) window.cancelIdleCallback(id);
      else clearTimeout(id as number);
    };
  }, []);

  useEffect(() => {
    if (!showDeferredSections) return;
    let cancelled = false;

    const loadLegacyExtras = async () => {
      setLoadingTop(true);
      try {
        const [topRes, sections] = await Promise.all([
          fetchTopProducts(15),
          fetchHomepageSections(),
        ]);
        if (cancelled) return;
        setTopProducts(topRes.items);
        setPopularProducts(sections.popular ?? []);
        const extra = [...topRes.items, ...(sections.popular ?? [])];
        if (extra.length > 0) {
          registerCatalog([...initialCatalog.items, ...extra]);
        }
      } catch {
        if (!cancelled) {
          setTopProducts([]);
          setPopularProducts([]);
        }
      } finally {
        if (!cancelled) setLoadingTop(false);
      }
    };

    const loadMarketplace = async () => {
      setLoadingTop(true);
      if (featuredStores.length === 0) setLoadingStores(true);
      try {
        const home = await fetchMarketplaceHome();
        if (cancelled) return;
        const top = home.topProducts ?? [];
        setTopProducts(top);
        const stores =
          (home.featuredStores?.length ?? 0) > 0
            ? home.featuredStores
            : (home.storeShowcase?.nearby ?? []);
        setFeaturedStores(stores);
        setPopularProducts(home.popularProducts ?? []);
        setMarketplacePromos(home.marketplacePromotions ?? []);
        const extra = [
          ...top,
          ...(home.marketplacePromotions ?? []),
          ...(home.popularProducts ?? []),
        ];
        if (extra.length > 0) {
          registerCatalog([...initialCatalog.items, ...extra]);
        }
      } catch {
        if (!cancelled) {
          setTopProducts([]);
          setFeaturedStores([]);
          setPopularProducts([]);
          setMarketplacePromos([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTop(false);
          setLoadingStores(false);
        }
      }
    };

    if (marketplaceEnabled) void loadMarketplace();
    else void loadLegacyExtras();

    return () => {
      cancelled = true;
    };
  }, [showDeferredSections, initialCatalog.items, registerCatalog, marketplaceEnabled, featuredStores.length]);

  return (
    <main className="bb-page bg-[#F8F8F8]">
      <section className="bb-shell bg-[#F8F8F8]">
        <div className="mb-3 border border-white/70 bg-[#F8F8F8] px-0 py-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              aria-label="Shaharni tanlash"
              className="inline-flex items-center gap-1.5 text-[#0f172a] active:scale-[0.98]"
            >
              <span className="text-xl font-bold tracking-tight">Chust</span>
              <ChevronDown className="h-5 w-5 text-slate-500" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              aria-label="Bildirishnomalar"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_4px_14px_rgba(17,24,39,0.06)] active:scale-[0.96]"
            >
              <Bell className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_4px_14px_rgba(17,24,39,0.06)]">
            <Link
              href="/search"
              className="flex flex-1 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2.5 text-slate-500"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Mahsulot qidirish</span>
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] text-slate-600"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>

        <HomeBannerCarousel />

        <HomeCategoriesRow />

        <HomeInstallCard />

        {marketplaceEnabled ? <HomeStoreTypes /> : null}

        {marketplaceEnabled ? (
          <FeaturedStoresCarousel stores={featuredStores} loading={loadingStores} />
        ) : null}

        <HomeDiscountedCarousel
          products={discountedProducts}
          loading={
            (loadingPromos || loadingTop) && discountedProducts.length === 0
          }
          onOpen={openProduct}
        />

        <HomeDeliveryBanner />

        {showDeferredSections ? (
          <>
            <PopularProductsCarousel products={popularProducts} loading={loadingTop} />

            <TopProductsCarousel products={topProducts} loading={loadingTop} />

            <CatalogInfiniteGrid
              initial={initialCatalog}
              source={catalogSource}
              className="mt-5 pb-24"
            />
          </>
        ) : (
          <div className="mt-5 space-y-4 pb-24">
            <div className="bb-skeleton h-36 rounded-3xl" />
            <CatalogInfiniteGrid
              initial={initialCatalog}
              source={catalogSource}
              className="mt-2"
            />
          </div>
        )}

        <MobileNav />
      </section>
    </main>
  );
}
