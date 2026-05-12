'use client';

import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { memo, useState } from 'react';
import { formatMoneyUz } from '@/lib/format';
import { SafeImage } from '@/components/safe-image';
import { incrementCart } from '@/lib/cart-store';
import { useCartPending, useCartQuantity } from '@/lib/use-cart-store';

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
  href?: string;
  imageUrl?: string | null;
};

function stopLinkNavigation(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function ProductCardBase({
  id,
  name,
  price,
  href,
  variants,
}: ProductCardProps) {
  const effectiveVariants = variants ?? EMPTY_VARIANTS;
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [variantSig, setVariantSig] = useState(() => keyOfVariants(effectiveVariants));

  const currentSig = keyOfVariants(effectiveVariants);
  if (currentSig !== variantSig) {
    setVariantSig(currentSig);
    setActiveVariantIndex(0);
  }

  const activeVariant =
    effectiveVariants.length > 0
      ? effectiveVariants[Math.min(activeVariantIndex, effectiveVariants.length - 1)]
      : null;

  const activeVariantId = activeVariant?.id;
  const activeQuantity = useCartQuantity(activeVariantId);
  const activeSyncing = useCartPending(activeVariantId);

  const activeBasePrice = Number(activeVariant?.price ?? price);
  const activeDiscountPrice =
    activeVariant?.discountPrice && activeVariant.discountPrice > 0 && activeVariant.discountPrice < activeBasePrice
      ? Number(activeVariant.discountPrice)
      : null;
  const discountPercent = activeDiscountPrice
    ? Math.max(1, Math.round(((activeBasePrice - activeDiscountPrice) / activeBasePrice) * 100))
    : null;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageKey, setImageKey] = useState(activeVariantId ?? '');
  if (activeVariantId && activeVariantId !== imageKey) {
    setImageKey(activeVariantId);
    setImageLoaded(false);
  }

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

  const outOfStock = activeVariant ? (activeVariant.stock ?? 0) <= 0 : true;

  const handleAdd = (event: React.SyntheticEvent) => {
    stopLinkNavigation(event);
    if (!activeVariant) return;
    incrementCart(activeVariant.id, id, 1);
  };

  const handleIncrease = (event: React.SyntheticEvent) => {
    stopLinkNavigation(event);
    if (!activeVariant) return;
    incrementCart(activeVariant.id, id, 1);
  };

  const handleDecrease = (event: React.SyntheticEvent) => {
    stopLinkNavigation(event);
    if (!activeVariant) return;
    incrementCart(activeVariant.id, id, -1);
  };

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <Link href={href ?? '#'} className="block">
        {activeVariant ? (
          <div
            className="relative h-48 w-full overflow-hidden rounded-t-3xl bg-white sm:h-56"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {!imageLoaded ? <div className="absolute inset-0 bg-white" /> : null}
            <div
              className="relative flex h-full w-full bg-white transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
            >
              {effectiveVariants.map((variant) => (
                <div key={variant.id} className="flex h-full min-w-full items-center justify-center bg-white">
                  <SafeImage
                    src={variant.imageUrl ?? undefined}
                    alt={variant.flavor || name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain object-center"
                    fallbackClassName="h-full w-full bg-gradient-to-br from-green-200 to-green-100"
                    onLoad={() => setImageLoaded(true)}
                  />
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
                    onClick={handleDecrease}
                    aria-label="Sonni kamaytirish"
                    aria-busy={activeSyncing}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-700 transition active:scale-90"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <span className="min-w-5 text-center text-xs font-semibold text-[#121212] tabular-nums">
                    {activeQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrease}
                    aria-label="Sonni oshirish"
                    aria-busy={activeSyncing}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16A34A] text-white transition active:scale-90"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={outOfStock}
                  aria-label={outOfStock ? 'Mahsulot tugagan' : 'Savatga qo‘shish'}
                  aria-busy={activeSyncing}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.35)] transition active:scale-90 disabled:opacity-50"
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

const EMPTY_VARIANTS: Variant[] = [];

function keyOfVariants(list: Variant[]): string {
  if (!list.length) return '';
  return list.map((variant) => `${variant.id}:${variant.imageUrl ?? ''}`).join('|');
}

function areVariantsEqual(prev: Variant[] | undefined, next: Variant[] | undefined): boolean {
  const a = prev ?? EMPTY_VARIANTS;
  const b = next ?? EMPTY_VARIANTS;
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id) return false;
    if (x.price !== y.price) return false;
    if ((x.discountPrice ?? null) !== (y.discountPrice ?? null)) return false;
    if ((x.stock ?? 0) !== (y.stock ?? 0)) return false;
    if ((x.imageUrl ?? '') !== (y.imageUrl ?? '')) return false;
    if ((x.flavor ?? '') !== (y.flavor ?? '')) return false;
  }
  return true;
}

function arePropsEqual(prev: ProductCardProps, next: ProductCardProps): boolean {
  if (prev.id !== next.id) return false;
  if (prev.name !== next.name) return false;
  if (prev.price !== next.price) return false;
  if (prev.href !== next.href) return false;
  if ((prev.imageUrl ?? '') !== (next.imageUrl ?? '')) return false;
  return areVariantsEqual(prev.variants, next.variants);
}

export const ProductCard = memo(ProductCardBase, arePropsEqual);
