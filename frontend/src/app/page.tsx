'use client';

import { Bell, ChevronDown, Heart, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, categoryEvents, guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { HomeBannerCarousel } from '@/components/home/home-banner-carousel';
import { CategoryCard, CategoryCardSkeleton } from '@/components/home/category-card';
import { HomeInstallCard } from '@/components/pwa/HomeInstallCard';
import { ProductCard } from '@/components/product-card';
import { HomeDeliveryBanner } from '@/components/home/home-delivery-banner';
import { SafeImage } from '@/components/safe-image';
import { formatMoneyUz } from '@/lib/format';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

type Product = {
  id: string;
  name: string;
  price: string;
  unit?: string | null;
  unitType?: string | null;
  sellingMode?: string | null;
  stepAmount?: number | null;
  minimumAmount?: number | null;
  categoryId?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  imageThumbUrl?: string | null;
  cashbackType?: string | null;
  cashbackValue?: number | null;
  variants?: Array<{
    id: string;
    flavor?: string | null;
    description?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
};
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

export default function Home() {
  const { openProduct, registerCatalog } = useProductSheet();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  useEffect(() => {
    guestStorage.getGuestId();
    void loadCategories();
    void loadProducts();
    const onCategoryChanged = () => void loadCategories();
    window.addEventListener(categoryEvents.changedEventName, onCategoryChanged);
    return () => {
      window.removeEventListener(categoryEvents.changedEventName, onCategoryChanged);
    };
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await api.get<Category[]>('/categories');
      const featured = data
        .filter((category) => category.isFeatured !== false && category.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setCategories(featured);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    } finally {
      setLoadingProducts(false);
    }
  };

  const renderableProducts = useMemo(() => products, [products]);
  const discountedProducts = useMemo(
    () =>
      renderableProducts.filter((product) =>
        product.variants?.some(
          (variant) =>
            typeof variant.discountPrice === 'number' &&
            variant.discountPrice > 0 &&
            variant.discountPrice < Number(variant.price),
        ),
      ),
    [renderableProducts],
  );
  const nonDiscountedProducts = useMemo(() => {
    const discountedIds = new Set(discountedProducts.map((product) => product.id));
    return renderableProducts.filter((product) => !discountedIds.has(product.id));
  }, [renderableProducts, discountedProducts]);
  const popularProducts = useMemo(() => nonDiscountedProducts.slice(0, 12), [nonDiscountedProducts]);
  const recommendedProducts = useMemo(() => nonDiscountedProducts.slice(12), [nonDiscountedProducts]);

  useEffect(() => {
    registerCatalog(renderableProducts as StorefrontProduct[]);
  }, [renderableProducts, registerCatalog]);

  const toStorefrontProduct = (product: Product): StorefrontProduct => ({
    id: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit ?? product.unitType,
    sellingMode: product.sellingMode,
    stepAmount: product.stepAmount,
    minimumAmount: product.minimumAmount,
    imageUrl: product.imageUrl,
    imageCardUrl: product.imageCardUrl,
    imageThumbUrl: product.imageThumbUrl,
    variants: product.variants,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let deferred: number | null = null;

    if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
      deferred = window.requestIdleCallback(() => setShowDeferredSections(true), { timeout: 180 });
    } else {
      deferred = window.setTimeout(() => setShowDeferredSections(true), 120);
    }

    return () => {
      if ('cancelIdleCallback' in window && deferred !== null && typeof window.cancelIdleCallback === 'function') {
        try {
          window.cancelIdleCallback(deferred);
        } catch {
          clearTimeout(deferred);
        }
      } else if (deferred !== null) {
        clearTimeout(deferred);
      }
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
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Mahsulot yoki kategoriya qidirish"
              />
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] text-slate-600">
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
            <section className="mt-5 rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#F43F5E] p-3 text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Aksiya va chegirmalar</h2>
          </div>
          <div className="bb-scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
            {loadingProducts
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="min-w-[130px] rounded-2xl bg-white p-2">
                    <div className="bb-skeleton h-20 w-full rounded-xl" />
                    <div className="bb-skeleton mt-2 h-3 w-2/3" />
                  </div>
                ))
              : discountedProducts.map((product) => {
              const variant = product.variants?.[0];
              const basePrice = Number(variant?.price ?? product.price);
              const salePrice = Number(variant?.discountPrice ?? basePrice);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProduct(toStorefrontProduct(product))}
                  className="min-w-[130px] rounded-2xl bg-white p-2 text-left text-[#111111] transition active:scale-[0.98]"
                >
                  <div className="relative h-20 overflow-hidden rounded-xl bg-white">
                    <SafeImage
                      src={variant?.imageUrl ?? product.imageCardUrl ?? product.imageUrl ?? undefined}
                      alt={product.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-100 to-green-50"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold">{product.name}</p>
                  <div className="mt-1 flex flex-col">
                    {salePrice < basePrice ? (
                      <p className="text-[10px] font-medium leading-none text-slate-400 line-through opacity-80">
                        {formatMoneyUz(basePrice)}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-sm font-bold leading-tight text-[#121212] tabular-nums">
                      {formatMoneyUz(salePrice)}
                    </p>
                  </div>
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

            <HomeDeliveryBanner />

            <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111111]">Mashhur mahsulotlar</h2>
            <Link href="/categories" className="text-sm font-medium text-[#16C25B]">
              Barchasini ko'rish
            </Link>
          </div>
          {!loadingProducts && popularProducts.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">Hozircha mahsulotlar yo‘q.</div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {loadingProducts
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="rounded-3xl bg-white p-3">
                    <div className="bb-skeleton h-36 w-full rounded-2xl" />
                    <div className="bb-skeleton mt-3 h-4 w-2/3" />
                  </div>
                ))
              : popularProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                unit={(product.unit ?? product.unitType) ?? undefined}
                sellingMode={product.sellingMode ?? undefined}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
                stepAmount={product.stepAmount}
                minimumAmount={product.minimumAmount}
                imageCardUrl={product.imageCardUrl}
                imageThumbUrl={product.imageThumbUrl}
                cashbackType={product.cashbackType ?? undefined}
                cashbackValue={product.cashbackValue ?? undefined}
              />
            ))}
          </div>
            </section>

            <section className="mt-5 pb-24">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111111]">Siz uchun tavsiya</h2>
            <Link href="/categories" className="text-sm font-medium text-[#16C25B]">
              Yana
            </Link>
          </div>
          {!loadingProducts && recommendedProducts.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
              Barcha faol mahsulotlar yuqorida ko‘rsatildi.
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {loadingProducts
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="rounded-3xl bg-white p-3">
                    <div className="bb-skeleton h-36 w-full rounded-2xl" />
                    <div className="bb-skeleton mt-3 h-4 w-2/3" />
                  </div>
                ))
              : recommendedProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                unit={(product.unit ?? product.unitType) ?? undefined}
                sellingMode={product.sellingMode ?? undefined}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
                stepAmount={product.stepAmount}
                minimumAmount={product.minimumAmount}
                imageCardUrl={product.imageCardUrl}
                imageThumbUrl={product.imageThumbUrl}
                cashbackType={product.cashbackType ?? undefined}
                cashbackValue={product.cashbackValue ?? undefined}
              />
            ))}
          </div>
            </section>
          </>
        ) : (
          <div className="mt-5 space-y-4 pb-24">
            <div className="bb-skeleton h-36 rounded-3xl" />
            <div className="bb-skeleton h-24 rounded-3xl" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl bg-white p-3">
                  <div className="bb-skeleton h-36 w-full rounded-2xl" />
                  <div className="bb-skeleton mt-3 h-4 w-2/3" />
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
