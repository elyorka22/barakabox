'use client';

import Link from 'next/link';
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

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <Link href={href ?? '#'} className="block">
        {activeVariant ? (
          <div
            className="relative h-36 w-full overflow-hidden rounded-t-3xl bg-slate-50 sm:h-40"
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
                      className="h-full w-full object-cover object-center"
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
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                {effectiveVariants.map((variant, idx) => (
                  <button
                    type="button"
                    key={variant.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      goToVariant(idx);
                    }}
                    className={`h-1.5 w-1.5 rounded-full ${idx === activeVariantIndex ? 'bg-white' : 'bg-white/50'}`}
                  >
                    <span className="sr-only">{`Variant ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="h-28 rounded-2xl bg-gradient-to-br from-green-200 to-green-100" />
        )}
        <div className="px-3 pb-2.5 pt-2.5 sm:px-3.5">
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
      <div className="flex items-center justify-end px-3 pb-3 sm:px-3.5 sm:pb-3.5">
        {activeVariant && activeQuantity > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] p-1">
            <button
              onClick={() => onDecrease?.(activeVariant.id, id)}
              disabled={activeLoading}
              className="h-7 w-7 rounded-lg bg-white text-sm font-bold text-gray-700 disabled:opacity-50"
            >
              -
            </button>
            <span className="w-5 text-center text-xs font-semibold text-[#121212]">{activeQuantity}</span>
            <button
              onClick={() => onIncrease?.(activeVariant.id, id)}
              disabled={activeLoading}
              className="h-7 w-7 rounded-lg bg-[#16A34A] text-sm font-bold text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!activeVariant) return;
              onAdd(activeVariant.id, id);
            }}
            disabled={!activeVariant || activeLoading || (activeVariant.stock ?? 0) <= 0}
            className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {activeLoading ? "Qo'shilmoqda..." : "Savatga"}
          </button>
        )}
      </div>
    </article>
  );
}
