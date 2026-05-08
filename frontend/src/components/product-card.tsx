'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatMoneyUz } from '@/lib/format';
import { getDefaultVariant } from '@/lib/default-variant';

type Variant = {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
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
  loading?: boolean;
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
  loading,
  href,
  imageUrl,
  variants = [],
}: ProductCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const effectiveVariants = variants;
  const defaultVariant = getDefaultVariant({ variants });
  const variantIdsKey = useMemo(() => effectiveVariants.map((variant) => variant.id).join('|'), [effectiveVariants]);

  const activeVariant =
    effectiveVariants.length > 0
      ? effectiveVariants[Math.min(activeVariantIndex, effectiveVariants.length - 1)]
      : null;

  const activeQuantity = activeVariant ? quantityByVariantId?.[activeVariant.id] ?? quantity : 0;

  useEffect(() => {
    setLoaded(false);
  }, [activeVariant?.id]);

  useEffect(() => {
    if (!effectiveVariants?.length) {
      setActiveVariantIndex(0);
      return;
    }
    if (!defaultVariant) {
      setActiveVariantIndex(0);
      return;
    }
    const idx = effectiveVariants.findIndex((v) => v.id === defaultVariant.id);
    setActiveVariantIndex(idx >= 0 ? idx : 0);
  }, [variantIdsKey, defaultVariant?.id]);

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
    <article className="rounded-3xl bg-white p-3 shadow-sm">
      <Link href={href ?? '#'} className="block">
        {activeVariant ? (
          <div
            className="relative h-28 w-full overflow-hidden rounded-2xl"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {!loaded ? <div className="bb-skeleton absolute inset-0" /> : null}
            <div
              className="flex h-28 w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
            >
              {effectiveVariants.map((variant) => (
                <div key={variant.id} className="h-28 min-w-full">
                  {variant.imageUrl ? (
                    <img
                      src={variant.imageUrl}
                      alt={variant.title || name}
                      loading="lazy"
                      decoding="async"
                      className="h-28 w-full object-cover"
                      onLoad={() => setLoaded(true)}
                      onError={() => setLoaded(true)}
                    />
                  ) : (
                    <div className="h-28 rounded-2xl bg-gradient-to-br from-green-200 to-green-100" />
                  )}
                </div>
              ))}
            </div>
            {effectiveVariants.length > 1 ? (
              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
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
        {activeVariant ? (
          <>
            <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-[#121212]">{activeVariant.title || name}</h3>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{activeVariant.description ?? ''}</p>
          </>
        ) : (
          <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-[#121212]">Hozircha mavjud emas</h3>
        )}
        <div className="mt-1 flex items-center justify-between">
          <p className="text-base font-bold text-[#121212]">{activeVariant ? formatMoneyUz(activeVariant.price) : '—'}</p>
          <span className="text-xs text-gray-500">⭐ 4.8</span>
        </div>
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700">-10%</span>
        {activeVariant && activeQuantity > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] p-1">
            <button
              onClick={() => onDecrease?.(activeVariant.id, id)}
              disabled={loading}
              className="h-7 w-7 rounded-lg bg-white text-sm font-bold text-gray-700 disabled:opacity-50"
            >
              -
            </button>
            <span className="w-5 text-center text-xs font-semibold text-[#121212]">{activeQuantity}</span>
            <button
              onClick={() => onIncrease?.(activeVariant.id, id)}
              disabled={loading}
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
            disabled={!activeVariant || loading || (activeVariant.stock ?? 0) <= 0}
            className="rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        )}
      </div>
    </article>
  );
}
