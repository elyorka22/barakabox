'use client';

import { motion } from 'framer-motion';
import { Heart, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, authStorage, categoryEvents, guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { HomeInstallCard } from '@/components/pwa/HomeInstallCard';
import { ProductCard } from '@/components/product-card';
import { formatMoneyUz } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  price: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
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
type CartResponse = {
  items: Array<{
    id: string;
    quantity: number;
    product?: { id: string } | null;
    variant?: { id: string } | null;
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

const HERO_SLIDES = [
  {
    title: 'Fresh mahsulotlar eng yaxshi narxda!',
    subtitle: 'Tez yetkazib berish va sifat kafolati.',
    cta: 'Buyurtma berish',
  },
  {
    title: 'Kundalik savdo uchun premium tanlov',
    subtitle: "Doimiy chegirmalar va yangi mahsulotlar.",
    cta: "Aksiyani ko'rish",
  },
];

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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loadingByVariantId, setLoadingByVariantId] = useState<Record<string, boolean>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const token = authStorage.getAccessToken();

  useEffect(() => {
    guestStorage.getGuestId();
    void loadCategories();
    void loadProducts();
    void loadCart();
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

  const loadCart = async () => {
    try {
      const data = await api.get<CartResponse>('/cart', token, true);
      setCart(data);
    } catch {
      setCart(null);
    }
  };

  const addProduct = async (variantId: string, productId: string) => {
    setLoadingByVariantId((prev) => ({ ...prev, [variantId]: true }));
    setError('');
    try {
      await api.post('/cart/items', { productId, variantId, quantity: 1 }, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mahsulotni savatga qo'shib bo'lmadi");
    } finally {
      setLoadingByVariantId((prev) => ({ ...prev, [variantId]: false }));
    }
  };

  const changeProductQty = async (variantId: string, productId: string, delta: number) => {
    setLoadingByVariantId((prev) => ({ ...prev, [variantId]: true }));
    setError('');
    try {
      await api.post('/cart/items', { productId, variantId, quantity: delta }, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoadingByVariantId((prev) => ({ ...prev, [variantId]: false }));
    }
  };

  const quantityByVariantId = useMemo(() => {
    const map: Record<string, number> = {};
    if (!cart) return map;
    for (const item of cart.items) {
      if (item.variant?.id) {
        map[item.variant.id] = (map[item.variant.id] ?? 0) + item.quantity;
      }
    }
    return map;
  }, [cart]);

  const renderableProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          Array.isArray(product.variants) &&
          product.variants.length > 0 &&
          product.variants.some((variant) => Boolean(variant.id)),
      ),
    [products],
  );
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
  const popularProducts = useMemo(() => renderableProducts.slice(0, 6), [renderableProducts]);
  const recommendedProducts = useMemo(() => renderableProducts.slice(6, 12), [renderableProducts]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const deferred =
      'requestIdleCallback' in window
        ? window.requestIdleCallback(() => setShowDeferredSections(true), { timeout: 180 })
        : window.setTimeout(() => setShowDeferredSections(true), 120);

    return () => {
      if ('cancelIdleCallback' in window && typeof deferred === 'number') {
        window.cancelIdleCallback(deferred);
      } else {
        window.clearTimeout(deferred as number);
      }
    };
  }, []);

  return (
    <main className="bb-page bg-[#F8F8F8]">
      <section className="bb-shell bg-[#F8F8F8]">
        <div className="mb-3 border border-white/70 bg-[#F8F8F8] px-0 py-0">
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

        <motion.section
          className="relative mt-3 overflow-hidden rounded-3xl bg-gradient-to-r from-[#16C25B] to-[#0FA34B] p-4 text-white shadow-[0_10px_24px_rgba(22,194,91,0.25)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            key={heroIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <p className="max-w-[74%] text-xl font-bold leading-6">{HERO_SLIDES[heroIndex]?.title}</p>
            <p className="max-w-[76%] text-[13px] text-white/90">{HERO_SLIDES[heroIndex]?.subtitle}</p>
            <button
              type="button"
              className="mt-0.5 rounded-2xl bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm"
            >
              {HERO_SLIDES[heroIndex]?.cta}
            </button>
          </motion.div>
          <div className="absolute bottom-3 left-5 flex gap-1.5">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === heroIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </motion.section>

        <HomeInstallCard />

        <section className="mt-5">
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {loadingCategories
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="bb-skeleton h-16 w-16 rounded-full" />
                    <div className="bb-skeleton h-3 w-14" />
                  </div>
                ))
              : categories.map((item, idx) => {
                  return (
                    <Link
                      key={`${item.name}-${idx}`}
                      href={`/categories/${item.slug}`}
                      className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-[1.03] active:scale-[1.03]"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#22c55e]/70 bg-white shadow-[0_8px_18px_rgba(34,197,94,0.16)]">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full rounded-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="text-2xl">{categoryEmoji(item.name)}</span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-center text-[11px] font-medium text-[#111111]">{item.name}</p>
                    </Link>
                  );
                })}
          </div>
        </section>

        {showDeferredSections ? (
          <>
            <section className="mt-5 rounded-3xl bg-[#8B5CF6] p-3 text-white shadow-[0_12px_24px_rgba(139,92,246,0.28)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Aksiya va chegirmalar</h2>
            <div className="rounded-xl bg-white/20 px-2 py-1 text-[11px]">03 : 12 : 45</div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {loadingProducts
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="min-w-[130px] rounded-2xl bg-white p-2">
                    <div className="bb-skeleton h-20 w-full rounded-xl" />
                    <div className="bb-skeleton mt-2 h-3 w-2/3" />
                  </div>
                ))
              : discountedProducts.slice(0, 8).map((product) => {
              const variant = product.variants?.[0];
              const basePrice = Number(variant?.price ?? product.price);
              const salePrice = Number(variant?.discountPrice ?? basePrice);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="min-w-[130px] rounded-2xl bg-white p-2 text-[#111111]"
                >
                  <div className="relative h-20 overflow-hidden rounded-xl bg-slate-100">
                    {variant?.imageUrl || product.imageCardUrl || product.imageUrl ? (
                      <img
                        src={variant?.imageUrl ?? product.imageCardUrl ?? product.imageUrl ?? ''}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold">{product.name}</p>
                  <p className="text-sm font-bold">{formatMoneyUz(salePrice)}</p>
                  <p className="text-[10px] text-slate-400 line-through">{formatMoneyUz(basePrice)}</p>
                </Link>
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

            <section className="mt-4 rounded-3xl bg-[#F2E5CC] p-4">
          <p className="text-base font-semibold text-[#111111]">50 000 so'mdan boshlab bepul yetkazib berish</p>
          <p className="mt-1 text-xs text-slate-600">Tezkor delivery xizmati har kuni 24/7</p>
            </section>

            <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111111]">Mashhur mahsulotlar</h2>
            <Link href="/categories" className="text-sm font-medium text-[#16C25B]">
              Barchasini ko'rish
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                onAdd={addProduct}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                onIncrease={(variantId, productId) => void changeProductQty(variantId, productId, 1)}
                onDecrease={(variantId, productId) => void changeProductQty(variantId, productId, -1)}
                quantityByVariantId={quantityByVariantId}
                loadingByVariantId={loadingByVariantId}
                href={`/products/${product.id}`}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
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
          <div className="grid grid-cols-2 gap-3">
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
                onAdd={addProduct}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                onIncrease={(variantId, productId) => void changeProductQty(variantId, productId, 1)}
                onDecrease={(variantId, productId) => void changeProductQty(variantId, productId, -1)}
                quantityByVariantId={quantityByVariantId}
                loadingByVariantId={loadingByVariantId}
                href={`/products/${product.id}`}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
              />
            ))}
          </div>
            </section>
          </>
        ) : (
          <div className="mt-5 space-y-4 pb-24">
            <div className="bb-skeleton h-36 rounded-3xl" />
            <div className="bb-skeleton h-24 rounded-3xl" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl bg-white p-3">
                  <div className="bb-skeleton h-36 w-full rounded-2xl" />
                  <div className="bb-skeleton mt-3 h-4 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <MobileNav />
      </section>
    </main>
  );
}
