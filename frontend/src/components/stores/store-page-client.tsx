'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeImage } from '@/components/safe-image';
import { Search } from 'lucide-react';
import { StoreProductsGrid } from '@/components/stores/store-products-grid';
import {
  fetchStoreProducts,
  type StoreCard,
  type StoreDetailResponse,
} from '@/lib/stores-api';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  initialDetail: StoreDetailResponse;
  initialProducts: StorefrontProduct[];
  initialTotalPages: number;
};

export function StorePageClient({
  initialDetail,
  initialProducts,
  initialTotalPages,
}: Props) {
  const store = initialDetail.store;
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [promoOnly, setPromoOnly] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const skipFilterReload = useRef(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const reloadProducts = useCallback(
    async (opts: { page: number; append: boolean }) => {
      if (opts.append) setLoadingMore(true);
      else setLoadingFilter(true);
      try {
        const res = await fetchStoreProducts(store.slug, {
          page: opts.page,
          limit: 24,
          q: debouncedSearch || undefined,
          categoryId: categoryId || undefined,
          promo: promoOnly || undefined,
        });
        setPage(res.page);
        setTotalPages(res.totalPages);
        setProducts((prev) => (opts.append ? [...prev, ...res.items] : res.items));
      } catch {
        if (!opts.append) setProducts([]);
      } finally {
        setLoadingMore(false);
        setLoadingFilter(false);
      }
    },
    [store.slug, debouncedSearch, categoryId, promoOnly],
  );

  useEffect(() => {
    if (skipFilterReload.current) {
      skipFilterReload.current = false;
      if (!debouncedSearch && !categoryId && !promoOnly) return;
    }
    void reloadProducts({ page: 1, append: false });
  }, [debouncedSearch, categoryId, promoOnly, reloadProducts]);

  const categories = initialDetail.categories;
  const hasPromos = initialDetail.promotionCount > 0;

  const showLoadMore = page < totalPages;

  return (
    <>
      <div className="sticky top-0 z-10 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Do‘kondan qidirish..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="Do‘kondan qidirish"
          />
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="bb-scrollbar-hide flex gap-2 overflow-x-auto px-4 py-3">
          <button
            type="button"
            onClick={() => setCategoryId('')}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              !categoryId ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                categoryId === cat.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      ) : null}

      {hasPromos ? (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setPromoOnly((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              promoOnly ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'
            }`}
          >
            Aksiyalar {initialDetail.promotionCount > 0 ? `(${initialDetail.promotionCount})` : ''}
          </button>
        </div>
      ) : null}

      {loadingFilter ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">Yuklanmoqda...</p>
      ) : (
        <StoreProductsGrid products={products} storeName={store.name} />
      )}

      {showLoadMore ? (
        <div className="px-4 py-4">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void reloadProducts({ page: page + 1, append: true })}
            className="w-full rounded-xl border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-60"
          >
            {loadingMore ? 'Yuklanmoqda...' : 'Ko‘proq mahsulot'}
          </button>
        </div>
      ) : null}
    </>
  );
}

export function StoreHero({ store }: { store: StoreCard }) {
  const banner = store.banner ?? store.bannerUrl;
  const logo = store.logo ?? store.logoUrl;

  return (
    <div className="relative">
      <div className="h-32 w-full bg-gradient-to-br from-emerald-600 to-teal-700">
        {banner ? (
          <SafeImage src={banner} alt="" className="h-full w-full object-cover" sizes="100vw" />
        ) : null}
      </div>
      <div className="relative -mt-8 px-4 pb-2">
        <div className="flex items-end gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-[#F8F8F8] bg-white shadow-md">
            {logo ? (
              <SafeImage
                src={logo}
                alt={store.name}
                className="h-full w-full object-cover"
                sizes="64px"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl">🏪</span>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl font-bold text-[#111827]">{store.name}</h1>
            {store.address ? <p className="text-sm text-slate-500">{store.address}</p> : null}
          </div>
        </div>
        {store.description ? (
          <p className="mt-2 text-sm text-slate-600">{store.description}</p>
        ) : null}
      </div>
    </div>
  );
}
