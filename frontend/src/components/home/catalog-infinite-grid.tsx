'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { fetchProductsPage, type PaginatedProducts } from '@/lib/storefront-api';
import { mapStorefrontProductToCardProps } from '@/lib/storefront-product-card';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

const PAGE_SIZE = 24;
const SENTINEL_ROOT_MARGIN = '480px 0px';

type Props = {
  initial: PaginatedProducts;
  categoryId?: string;
  businessId?: string;
  search?: string;
  sort?: string;
  className?: string;
};

function mergeUniqueProducts(prev: StorefrontProduct[], next: StorefrontProduct[]) {
  if (next.length === 0) return prev;
  const seen = new Set(prev.map((p) => p.id));
  const merged = [...prev];
  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

const CatalogGridItem = memo(function CatalogGridItem({
  product,
  priorityImage,
}: {
  product: StorefrontProduct;
  priorityImage: boolean;
}) {
  const { openProduct } = useProductSheet();
  const cardProps = mapStorefrontProductToCardProps(product);

  return (
    <div
      className="catalog-grid-item min-h-[280px] cursor-pointer [content-visibility:auto] [contain-intrinsic-size:280px_220px]"
      onClick={() => openProduct(product)}
      role="presentation"
    >
      <ProductCard {...cardProps} imagePriority={priorityImage} />
    </div>
  );
});

function CatalogSkeletonRow() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, idx) => (
        <div
          key={`catalog-skeleton-${idx}`}
          className="min-h-[280px] rounded-3xl bg-white p-3"
          aria-hidden
        >
          <div className="bb-skeleton h-36 w-full rounded-2xl" />
          <div className="bb-skeleton mt-3 h-4 w-3/4 rounded" />
          <div className="bb-skeleton mt-2 h-4 w-1/2 rounded" />
        </div>
      ))}
    </>
  );
}

export function CatalogInfiniteGrid({
  initial,
  categoryId,
  businessId,
  search,
  sort,
  className = '',
}: Props) {
  const { registerCatalog } = useProductSheet();
  const [items, setItems] = useState<StorefrontProduct[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    registerCatalog(items);
  }, [items, registerCatalog]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || inFlightRef.current) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const result = await fetchProductsPage({
        page: nextPage,
        limit: PAGE_SIZE,
        categoryId,
        businessId,
        search,
        sort,
      });

      if (requestIdRef.current !== requestId) return;

      setItems((prev) => mergeUniqueProducts(prev, result.items));
      setPage(result.page);
      setHasMore(result.hasMore);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Mahsulotlarni yuklab bo'lmadi");
    } finally {
      if (requestIdRef.current === requestId) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [hasMore, page, categoryId, businessId, search, sort]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadNextPage();
        }
      },
      { root: null, rootMargin: SENTINEL_ROOT_MARGIN, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage]);

  return (
    <section className={className} aria-labelledby="catalog-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="catalog-heading" className="text-lg font-semibold text-[#111111]">
          Barcha mahsulotlar
        </h2>
        {initial.total > 0 ? (
          <span className="text-sm text-slate-500">{initial.total} ta</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((product, index) => (
          <CatalogGridItem key={product.id} product={product} priorityImage={index < 4} />
        ))}
        {loading ? <CatalogSkeletonRow /> : null}
      </div>

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden />

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadNextPage()}
            className="mt-2 font-semibold text-rose-800 underline"
          >
            Qayta urinish
          </button>
        </div>
      ) : null}

      {!hasMore && items.length > 0 && !loading ? (
        <p className="mt-4 pb-2 text-center text-sm text-slate-500">Barcha mahsulotlar yuklandi</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">Mahsulot topilmadi</p>
      ) : null}
    </section>
  );
}
