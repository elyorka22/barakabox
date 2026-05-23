'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { MobileNav } from '@/components/app-nav';
import { CategoryCard } from '@/components/home/category-card';
import { SafeImage } from '@/components/safe-image';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { fetchMarketplaceSearch, type MarketplaceSearchResult } from '@/lib/marketplace-search';
import { mapStorefrontProductToCardProps } from '@/lib/storefront-product-card';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

function categoryEmoji(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('non')) return '🥖';
  if (lower.includes('sabzavot')) return '🥬';
  if (lower.includes('meva')) return '🍎';
  return '🛒';
}

function SearchProductGrid({ products }: { products: StorefrontProduct[] }) {
  const { openProduct, registerCatalog } = useProductSheet();

  useEffect(() => {
    if (products.length > 0) registerCatalog(products);
  }, [products, registerCatalog]);

  if (products.length === 0) return null;

  return (
    <div className="catalog-grid mt-3">
      {products.map((product, idx) => {
        const cardProps = mapStorefrontProductToCardProps(product);
        return (
          <div
            key={product.listingId ?? product.id}
            className="catalog-grid-item cursor-pointer"
            onClick={() => openProduct(product)}
            role="presentation"
          >
            <ProductCard {...cardProps} imagePriority={idx < 4} />
          </div>
        );
      })}
    </div>
  );
}

export function SearchPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get('q')?.trim() ?? '';
  const [input, setInput] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarketplaceSearchResult | null>(null);
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    setInput(qParam);
  }, [qParam]);

  const runSearch = useCallback(async (term: string, page = 1) => {
    const q = term.trim();
    if (q.length < 2) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketplaceSearch({ q, page });
      setResult(data);
      if (trackedRef.current !== q) {
        trackedRef.current = q;
        void import('@/lib/analytics/client').then((m) =>
          m.trackAnalytics(ANALYTICS_EVENTS.SEARCH_USED, {
            query: q,
            legacyTotal: data.legacyProducts.total,
            listingTotal: data.listings.total,
            storeCount: data.stores.length,
            categoryCount: data.categories.length,
          }),
        );
      }
    } catch {
      setResult(null);
      setError('Qidiruvda xatolik. Qayta urinib ko‘ring.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(qParam);
  }, [qParam, runSearch]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const legacyItems = result?.legacyProducts.items ?? [];
  const listingItems = result?.listings.items ?? [];
  const hasProducts = legacyItems.length > 0 || listingItems.length > 0;

  return (
    <main className="bb-page bg-[#F8F8F8] pb-24">
      <div className="bb-shell px-4 pt-3">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <Search className="ml-1 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mahsulot, do‘kon yoki kategoriya"
              className="flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-slate-400"
              autoFocus
              minLength={2}
            />
            <button
              type="submit"
              className="rounded-xl bg-[#16a34a] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={input.trim().length < 2}
            >
              Qidirish
            </button>
          </form>
        </div>

        {qParam.length > 0 && qParam.length < 2 ? (
          <p className="text-sm text-slate-500">Kamida 2 ta belgi kiriting</p>
        ) : null}

        {loading ? <p className="py-8 text-center text-sm text-slate-500">Qidirilmoqda…</p> : null}

        {error ? <p className="py-4 text-sm text-red-600">{error}</p> : null}

        {!loading && qParam.length >= 2 && result ? (
          <div className="space-y-6">
            {result.categories.length > 0 ? (
              <section>
                <h2 className="text-base font-semibold text-[#111827]">Kategoriyalar</h2>
                <div className="mt-2 grid grid-cols-4 gap-3">
                  {result.categories.map((c) => (
                    <CategoryCard
                      key={c.id}
                      href={c.href}
                      name={c.name}
                      imageUrl={c.imageUrl}
                      fallbackEmoji={categoryEmoji(c.name)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {result.stores.length > 0 ? (
              <section>
                <h2 className="text-base font-semibold text-[#111827]">Do‘konlar</h2>
                <ul className="mt-2 space-y-2">
                  {result.stores.map((store) => (
                    <li key={store.id}>
                      <Link
                        href={`/stores/${store.slug}`}
                        className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                      >
                        <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-100">
                          {store.logoUrl ? (
                            <SafeImage src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-lg">🏪</span>
                          )}
                        </div>
                        <p className="font-medium text-[#111827]">{store.name}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasProducts ? (
              <section>
                <h2 className="text-base font-semibold text-[#111827]">Mahsulotlar</h2>
                {legacyItems.length > 0 ? (
                  <>
                    {listingItems.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">Katalog</p>
                    ) : null}
                    <SearchProductGrid products={legacyItems} />
                  </>
                ) : null}
                {listingItems.length > 0 ? (
                  <>
                    {legacyItems.length > 0 ? (
                      <p className="mt-4 text-xs text-slate-500">Do‘konlar</p>
                    ) : null}
                    <SearchProductGrid products={listingItems} />
                  </>
                ) : null}
              </section>
            ) : null}

            {!hasProducts && result.categories.length === 0 && result.stores.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">“{qParam}” bo‘yicha natija topilmadi</p>
            ) : null}
          </div>
        ) : null}

        {!qParam && !loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Qidiruv so‘zini kiriting</p>
        ) : null}
      </div>
      <MobileNav />
    </main>
  );
}
