'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, Heart, Search } from 'lucide-react';
import { api, categoryEvents, guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { HomeBannerCarousel } from '@/components/home/home-banner-carousel';
import { CategoryCard, CategoryCardSkeleton } from '@/components/home/category-card';
import { HomeInstallCard } from '@/components/pwa/HomeInstallCard';
import { ProductCard } from '@/components/product-card';
import { SafeImage } from '@/components/safe-image';
import { HomeDeliveryBanner } from '@/components/home/home-delivery-banner';
import { formatMoneyUz } from '@/lib/format';
import { fetchHomepageSections, type HomepageSections } from '@/lib/storefront-api';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  productCount: number;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

function categoryEmoji(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('non')) return '🥖';
  if (lower.includes('sabzavot')) return '🥬';
  if (lower.includes('meva')) return '🍎';
  if (lower.includes('un')) return '🌾';
  if (lower.includes('quruq')) return '🥜';
  if (lower.includes('ichimlik')) return '🥤';
  if (lower.includes('ovqat')) return '🥩';
  if (lower.includes("xo'jalik")) return '🧼';
  return '🛒';
}

function mapToCardProps(product: StorefrontProduct) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit ?? undefined,
    sellingMode: product.sellingMode ?? undefined,
    stepAmount: product.stepAmount,
    minimumAmount: product.minimumAmount,
    variants: product.variants?.map((variant) => ({
      ...variant,
      imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
    })),
    imageUrl: product.imageCardUrl ?? product.imageUrl,
    imageCardUrl: product.imageCardUrl,
    imageThumbUrl: product.imageThumbUrl,
    cashbackType: product.cashbackType ?? undefined,
    cashbackValue: product.cashbackValue ?? undefined,
    discountEnabled: product.discountEnabled,
    discountedPrice: product.discountedPrice,
    promotionBadge: product.promotionBadge,
    promotionEnabled: product.promotionEnabled,
    promotionStartAt: product.promotionStartAt,
    promotionEndAt: product.promotionEndAt,
  };
}

export function HomePageClient() {
  const { openProduct, registerCatalog } = useProductSheet();
  const [sections, setSections] = useState<HomepageSections | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  useEffect(() => {
    guestStorage.getGuestId();
    void loadCategories();
    void loadHome();
    const onCategoryChanged = () => void loadCategories();
    window.addEventListener(categoryEvents.changedEventName, onCategoryChanged);
    return () => window.removeEventListener(categoryEvents.changedEventName, onCategoryChanged);
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await api.get<Category[]>('/categories?featured=1');
      const featured = data
        .filter((c) => c.isFeatured !== false && c.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCategories(featured);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadHome = async () => {
    setLoading(true);
    try {
      const data = await fetchHomepageSections();
      setSections(data);
      const catalog = [...data.discounted, ...data.popular, ...data.recommended];
      registerCatalog(catalog);
    } catch {
      setSections({ discounted: [], popular: [], recommended: [], catalogVersion: 0 });
    } finally {
      setLoading(false);
    }
  };

  const discounted = sections?.discounted ?? [];
  const popular = sections?.popular ?? [];
  const recommended = sections?.recommended ?? [];

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
              href="/categories"
              className="flex flex-1 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2.5 text-slate-500"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Mahsulot yoki kategoriya qidirish</span>
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

        <section className="mt-6" aria-labelledby="home-categories-heading">
          <h2 id="home-categories-heading" className="sr-only">
            Kategoriyalar
          </h2>
          <div className="grid grid-cols-4 gap-x-3 gap-y-4">
            {loadingCategories
              ? Array.from({ length: 8 }).map((_, idx) => <CategoryCardSkeleton key={`cat-skeleton-${idx}`} />)
              : categories.map((item) => (
                  <CategoryCard
                    key={item.id ?? item.slug}
                    href={`/categories/${item.slug}`}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    fallbackEmoji={categoryEmoji(item.name)}
                  />
                ))}
          </div>
        </section>

        {showDeferredSections ? (
          <>
            {discounted.length > 0 ? (
              <section className="mt-5 rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#F43F5E] p-3 text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)]">
                <h2 className="text-base font-semibold">Aksiya va chegirmalar</h2>
                <div className="bb-scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
                  {loading
                    ? Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="min-w-[130px] rounded-2xl bg-white p-2">
                          <div className="bb-skeleton h-20 w-full rounded-xl" />
                        </div>
                      ))
                    : discounted.map((product) => {
                        const variant = product.variants?.[0];
                        const basePrice = Number(variant?.price ?? product.price);
                        const salePrice = Number(variant?.discountPrice ?? basePrice);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => openProduct(product)}
                            className="min-w-[130px] rounded-2xl bg-white p-2 text-left text-[#111111] transition active:scale-[0.98]"
                          >
                            <div className="relative h-20 overflow-hidden rounded-xl bg-white">
                              <SafeImage
                                src={variant?.imageUrl ?? product.imageCardUrl ?? product.imageUrl ?? undefined}
                                alt={product.name}
                                className="h-full w-full object-contain"
                                loading="lazy"
                                sizes="130px"
                              />
                            </div>
                            <p className="mt-2 line-clamp-1 text-xs font-semibold">{product.name}</p>
                            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#121212]">
                              {formatMoneyUz(salePrice)}
                            </p>
                          </button>
                        );
                      })}
                </div>
                <Link
                  href="/discounts"
                  className="mt-2 flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#111111]"
                >
                  <span>Barcha aksiyalar</span>
                  <span>›</span>
                </Link>
              </section>
            ) : null}

            <HomeDeliveryBanner />

            <ProductSection
              title="Mashhur mahsulotlar"
              products={popular}
              loading={loading}
              onOpen={openProduct}
            />

            <ProductSection
              title="Siz uchun tavsiya"
              products={recommended}
              loading={loading}
              onOpen={openProduct}
              className="pb-24"
            />
          </>
        ) : (
          <div className="mt-5 space-y-4 pb-24">
            <div className="bb-skeleton h-36 rounded-3xl" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl bg-white p-3">
                  <div className="bb-skeleton h-36 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        )}

        <MobileNav />
      </section>
    </main>
  );
}

function ProductSection({
  title,
  products,
  loading,
  onOpen,
  className = '',
}: {
  title: string;
  products: StorefrontProduct[];
  loading: boolean;
  onOpen: (p: StorefrontProduct) => void;
  className?: string;
}) {
  if (!loading && products.length === 0) return null;

  return (
    <section className={`mt-5 ${className}`.trim()}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111111]">{title}</h2>
        <Link href="/categories" className="text-sm font-medium text-[#16C25B]">
          Barchasini ko&apos;rish
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="rounded-3xl bg-white p-3">
                <div className="bb-skeleton h-36 w-full rounded-2xl" />
              </div>
            ))
          : products.map((product) => (
              <div key={product.id} onClick={() => onOpen(product)} className="cursor-pointer">
                <ProductCard {...mapToCardProps(product)} />
              </div>
            ))}
      </div>
    </section>
  );
}
