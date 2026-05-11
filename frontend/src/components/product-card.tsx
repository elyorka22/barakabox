'use client';

import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatMoneyUz } from '@/lib/format';

type Variant = {
  id: string;
  flavor?: string | null;
  description?: string | null;
  price: string | number;
  discountPrice?: number | null;
  stock?: number;
  imageUrl?: string | null;
};

type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  variants?: Variant[];
  onAdd: (variantId: string, productId: string) => void;
  onIncrease?: (variantId: string, productId: string) => void;
  onDecrease?: (variantId: string, productId: string) => void;
  quantity?: number;
  quantityByVariantId?: Record<string, number>;
  loadingByVariantId?: Record<string, boolean>;
  href?: string;
  imageUrl?: string | null;
};

export function ProductCard({
  id,
  name,
  price,
  onAdd,
  onIncrease,
  onDecrease,
  quantity = 0,
  quantityByVariantId,
  loadingByVariantId,
  href,
  imageUrl,
  variants = [],
}: ProductCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const effectiveVariants = variants;
  const variantIdsKey = useMemo(() => effectiveVariants.map((variant) => variant.id).join('|'), [effectiveVariants]);

  const activeVariant =
    effectiveVariants.length > 0
      ? effectiveVariants[Math.min(activeVariantIndex, effectiveVariants.length - 1)]
      : null;

  const activeQuantity = activeVariant ? quantityByVariantId?.[activeVariant.id] ?? quantity : 0;
  const activeLoading = activeVariant ? Boolean(loadingByVariantId?.[activeVariant.id]) : false;
  const activeBasePrice = Number(activeVariant?.price ?? price);
  const activeDiscountPrice =
    activeVariant?.discountPrice && activeVariant.discountPrice > 0 && activeVariant.discountPrice < activeBasePrice
      ? Number(activeVariant.discountPrice)
      : null;
  const discountPercent = activeDiscountPrice
    ? Math.max(1, Math.round(((activeBasePrice - activeDiscountPrice) / activeBasePrice) * 100))
    : null;

  useEffect(() => {
    setLoaded(false);
  }, [activeVariant?.id]);

  useEffect(() => {
    if (!effectiveVariants?.length) {
      setActiveVariantIndex(0);
      return;
    }
    setActiveVariantIndex(0);
  }, [variantIdsKey]);

  const goToVariant = (targetIndex: number) => {
    if (!effectiveVariants.length) return;
    setActiveVariantIndex(Math.max(0, Math.min(targetIndex, effectiveVariants.length - 1)));
  };

  const handleTouchEnd = (touchEndX: number) => {
    if (touchStartX === null) return;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 30) {
      setTouchStartX(null);
      return;
    }
    if (diff > 0) {
      goToVariant(activeVariantIndex + 1);
    } else {
      goToVariant(activeVariantIndex - 1);
    }
    setTouchStartX(null);
  };

  const stopLinkNavigation = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const outOfStock = activeVariant ? (activeVariant.stock ?? 0) <= 0 : true;

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <Link href={href ?? '#'} className="block">
        {activeVariant ? (
          <div
            className="relative h-48 w-full overflow-hidden rounded-t-3xl bg-slate-50 sm:h-56"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {!loaded ? <div className="bb-skeleton absolute inset-0" /> : null}
            <div
              className="flex h-full w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
            >
              {effectiveVariants.map((variant) => (
                <div key={variant.id} className="flex h-full min-w-full items-center justify-center">
                  {variant.imageUrl ? (
                    <img
                      src={variant.imageUrl}
                      alt={variant.flavor || name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain object-center"
                      onLoad={() => setLoaded(true)}
                      onError={() => setLoaded(true)}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-green-200 to-green-100" />
                  )}
                </div>
              ))}
            </div>
            {discountPercent ? (
              <span className="absolute left-2 top-2 rounded-lg bg-rose-600/90 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                -{discountPercent}%
              </span>
            ) : null}
            {effectiveVariants.length > 1 ? (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {effectiveVariants.map((variant, idx) => (
                  <button
                    type="button"
                    key={variant.id}
                    onClick={(event) => {
                      stopLinkNavigation(event);
                      goToVariant(idx);
                    }}
                    className={`h-1.5 w-1.5 rounded-full ${idx === activeVariantIndex ? 'bg-[#16A34A]' : 'bg-slate-300'}`}
                  >
                    <span className="sr-only">{`Variant ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="absolute bottom-2 right-2 z-10 flex items-center">
              {activeQuantity > 0 ? (
                <div
                  className="flex items-center gap-1 rounded-full bg-white/95 p-1 shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-sm"
                  onClick={stopLinkNavigation}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      stopLinkNavigation(event);
                      onDecrease?.(activeVariant.id, id);
                    }}
                    disabled={activeLoading}
                    aria-label="Sonni kamaytirish"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-700 transition active:scale-95 disabled:opacity-50"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <span className="min-w-5 text-center text-xs font-semibold text-[#121212]">
                    {activeQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      stopLinkNavigation(event);
                      onIncrease?.(activeVariant.id, id);
                    }}
                    disabled={activeLoading}
                    aria-label="Sonni oshirish"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16A34A] text-white transition active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    stopLinkNavigation(event);
                    onAdd(activeVariant.id, id);
                  }}
                  disabled={activeLoading || outOfStock}
                  aria-label={outOfStock ? 'Mahsulot tugagan' : 'Savatga qo‘shish'}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.35)] transition active:scale-95 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.6} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-28 rounded-2xl bg-gradient-to-br from-green-200 to-green-100" />
        )}
        <div className="px-3 pb-3 pt-2.5 sm:px-3.5">
          <h3 className="line-clamp-1 text-[13px] font-semibold text-[#121212]">{name}</h3>
          <p className="mt-0.5 line-clamp-1 min-h-4 text-[11px] font-medium text-slate-600">{activeVariant?.flavor ?? ''}</p>
          {activeVariant ? (
            activeDiscountPrice ? (
              <div className="mt-1 flex items-end gap-1.5">
                <p className="text-base font-bold text-[#121212]">{formatMoneyUz(activeDiscountPrice)}</p>
                <p className="text-xs text-slate-400 line-through">{formatMoneyUz(activeBasePrice)}</p>
              </div>
            ) : (
              <p className="mt-1 text-base font-bold text-[#121212]">{formatMoneyUz(activeBasePrice)}</p>
            )
          ) : (
            <p className="mt-1 text-base font-bold text-[#121212]">—</p>
          )}
        </div>
      </Link>
    </article>
  );
}
