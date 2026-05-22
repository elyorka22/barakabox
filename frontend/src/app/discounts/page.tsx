'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { fetchPromotionsPage, type PromotionSort } from '@/lib/storefront-api';
import { MobileNav } from '@/components/app-nav';
import { ProductCard } from '@/components/product-card';
import { hasVisibleDiscount } from '@/lib/promotion-product';
import type { StorefrontProduct } from '@/types/storefront-product';

const SORT_OPTIONS: { id: PromotionSort; label: string }[] = [
  { id: 'discount_desc', label: 'Eng katta chegirma' },
  { id: 'newest', label: 'Yangi' },
];

export default function DiscountsPage() {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<PromotionSort>('discount_desc');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadPage = useCallback(async (targetPage: number, replace: boolean) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const res = await fetchPromotionsPage({ page: targetPage, limit: 24, sort });
      const items = res.items.filter(hasVisibleDiscount);
      setProducts((prev) => (replace ? items : [...prev, ...items]));
      setPage(res.page);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksiyalarni yuklab bo‘lmadi');
      if (replace) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort]);

  useEffect(() => {
    void loadPage(1, true);
  }, [loadPage]);

  return (
    <main className="bb-page bg-[#F8F8F8]">
      <section className="bb-shell bg-[#F8F8F8] pb-24">
        <div className="bb-header-sticky !top-2 !mx-0 flex items-center justify-between !rounded-none !bg-[#F8F8F8]/95 !px-0 !py-0 shadow-none">
          <Link href="/" className="text-lg font-semibold text-[#111111]">
            ← Aksiya va chegirmalar
          </Link>
        </div>

        <div className="mt-3 rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#F43F5E] p-4 text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)]">
          <h1 className="text-xl font-semibold">Eng yaxshi aksiyalar siz uchun!</h1>
          <p className="mt-1 text-sm text-white/85">Chegirmalarni boy bermang</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2">
          <div className="bb-scrollbar-hide flex gap-1.5 overflow-x-auto">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSort(opt.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  sort === opt.id ? 'bg-[#8B5CF6] text-white' : 'bg-[#F3F4F6] text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Filtr
          </span>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
        ) : null}

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-x-1.5 gap-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bb-skeleton aspect-[3/4] rounded-[18px]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-500">Hozircha aksiya mahsulotlari yo‘q</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-1.5 gap-y-2 sm:grid-cols-3">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                unit={(product.unit ?? product.unitType) ?? undefined}
                sellingMode={product.sellingMode ?? undefined}
                variants={product.variants?.map((variant) => ({
                  ...variant,
                  price: variant.price,
                  imageUrl: variant.imageUrl ?? product.imageCardUrl ?? product.imageUrl,
                }))}
                imageUrl={product.imageCardUrl ?? product.imageUrl}
                stepAmount={product.stepAmount}
                minimumAmount={product.minimumAmount}
                imageCardUrl={product.imageCardUrl}
                cashbackType={product.cashbackType ?? undefined}
                cashbackValue={product.cashbackValue ?? undefined}
                discountEnabled={product.discountEnabled}
                discountedPrice={product.discountedPrice ?? product.effectivePrice ?? undefined}
                promotionBadge={product.promotionBadge}
                promotionEnabled={product.promotionEnabled}
                promotionStartAt={product.promotionStartAt}
                promotionEndAt={product.promotionEndAt}
                imagePriority={idx < 4}
              />
            ))}
          </div>
        )}

        {hasMore && !loading ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadPage(page + 1, false)}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-[#111111] disabled:opacity-60"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Yuklanmoqda…
              </>
            ) : (
              'Ko‘proq yuklash'
            )}
          </button>
        ) : null}
      </section>
      <MobileNav />
    </main>
  );
}
