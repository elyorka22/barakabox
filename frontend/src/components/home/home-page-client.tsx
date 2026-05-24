'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, ChevronDown, Heart, Search } from 'lucide-react';
import { guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { HomeBannerCarousel } from '@/components/home/home-banner-carousel';
import { CatalogInfiniteGrid, type CatalogSource } from '@/components/home/catalog-infinite-grid';
import { PopularProductsCarousel } from '@/components/home/popular-products-carousel';
import { HomeInstallCard } from '@/components/pwa/HomeInstallCard';
import type { PaginatedProducts } from '@/lib/storefront-api';
import { fetchMarketplaceHome } from '@/lib/marketplace-home';
import { TopProductsCarousel } from '@/components/home/top-products-carousel';
import { HomePromotionsCarousel } from '@/components/home/home-promotions-carousel';
import { HomeStoreTypes } from '@/components/home/home-store-types';
import { FeaturedStoresCarousel } from '@/components/home/featured-stores-carousel';
import type { StoreCard } from '@/lib/stores-api';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  initialCatalog: PaginatedProducts;
  catalogSource?: CatalogSource;
};

export function HomePageClient({ initialCatalog, catalogSource = 'legacy' }: Props) {
  const { registerCatalog } = useProductSheet();
  const [topProducts, setTopProducts] = useState<StorefrontProduct[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);
  const [featuredStores, setFeaturedStores] = useState<StoreCard[]>([]);
  const [popularProducts, setPopularProducts] = useState<StorefrontProduct[]>([]);
  const [promotionProducts, setPromotionProducts] = useState<StorefrontProduct[]>([]);
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  useEffect(() => {
    guestStorage.getGuestId();
    registerCatalog(initialCatalog.items);
  }, [initialCatalog.items, registerCatalog]);

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
    const loadMarketplace = async () => {
      setLoadingTop(true);
      try {
        const home = await fetchMarketplaceHome();
        if (cancelled) return;
        const top = home.topProducts ?? [];
        setTopProducts(top);
        setFeaturedStores(home.featuredStores ?? []);
        setPopularProducts(home.popularProducts ?? []);
        setPromotionProducts(home.marketplacePromotions ?? []);
        if (top.length > 0) {
          registerCatalog([...initialCatalog.items, ...top]);
        }
      } catch {
        if (!cancelled) {
          setTopProducts([]);
          setFeaturedStores([]);
          setPopularProducts([]);
          setPromotionProducts([]);
        }
      } finally {
        if (!cancelled) setLoadingTop(false);
      }
    };
    void loadMarketplace();
    return () => {
      cancelled = true;
    };
  }, [showDeferredSections, initialCatalog.items, registerCatalog]);

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
        <HomeInstallCard />

        <HomeStoreTypes />

        {showDeferredSections ? (
          <>
            <FeaturedStoresCarousel stores={featuredStores} />

            <PopularProductsCarousel products={popularProducts} loading={loadingTop} />

            <TopProductsCarousel products={topProducts} loading={loadingTop} />

            <HomePromotionsCarousel products={promotionProducts} loading={loadingTop} />

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
