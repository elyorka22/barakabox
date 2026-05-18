'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import { formatMoneyUz } from '@/lib/format';
import {
  DEFAULT_PRODUCT_UNIT,
  type ProductUnitCode,
  type SellingMode,
  PRODUCT_UNIT_LABEL_UZ,
  normalizeIncomingProductUnit,
  calculateSellingModeLineTotal,
  formatSellingModeQuantity,
  resolveSellingMode,
} from '@onlinebozor/product-units';
import { SafeImage } from '@/components/safe-image';
import { getCashbackPromoLabel } from '@/lib/cashback';
import { CashbackBadge } from '@/components/cashback-badge';
import { useCartQuantity } from '@/lib/use-cart-store';
import { ProductCardCartControl } from '@/components/product-card-cart-control';

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
  unit?: ProductUnitCode | string | null;
  sellingMode?: SellingMode | string | null;
  variants?: Variant[];
  href?: string;
  imageUrl?: string | null;
  cashbackType?: string | null;
  cashbackValue?: number | null;
};

function ProductCardBase({
  id,
  name,
  price,
  unit: unitProp,
  sellingMode: sellingModeProp,
  href,
  variants,
  cashbackType,
  cashbackValue,
}: ProductCardProps) {
  const cashbackPromo = getCashbackPromoLabel(cashbackType ?? 'NONE', Number(cashbackValue ?? 0));
  const unitType = normalizeIncomingProductUnit(unitProp) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = resolveSellingMode({ sellingMode: sellingModeProp, unit: unitProp ?? unitType });
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

  const activeVariantId = activeVariant?.id ?? '';
  const activeQuantity = useCartQuantity(activeVariantId);

  const activeBasePrice = Number(activeVariant?.price ?? price);
  const activeDiscountPrice =
    activeVariant?.discountPrice && activeVariant.discountPrice > 0 && activeVariant.discountPrice < activeBasePrice
      ? Number(activeVariant.discountPrice)
      : null;
  const unitPrice = activeDiscountPrice ?? activeBasePrice;
  const discountPercent = activeDiscountPrice
    ? Math.max(1, Math.round(((activeBasePrice - activeDiscountPrice) / activeBasePrice) * 100))
    : null;

  const displayQuantity = activeQuantity;
  const lineTotal = useMemo(
    () => calculateSellingModeLineTotal(unitPrice, displayQuantity, sellingMode),
    [unitPrice, displayQuantity, sellingMode],
  );

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
  const inCart = activeQuantity > 0;

  return (
    <article
      className={`overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow duration-200 ${
        inCart ? 'ring-2 ring-emerald-500/25' : ''
      }`}
    >
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
            {discountPercent || cashbackPromo ? (
              <div className="pointer-events-none absolute left-2 top-2 z-[5] flex max-w-[min(calc(100%-3.5rem),7.5rem)] flex-col items-stretch gap-1">
                {discountPercent ? (
                  <span className="inline-flex w-max max-w-full shrink-0 items-center rounded-full bg-gradient-to-br from-rose-600 via-rose-500 to-rose-700 px-1.5 py-0.5 text-[10px] font-extrabold leading-none tracking-tight text-white shadow-md shadow-rose-600/40 ring-1 ring-white/30">
                    -{discountPercent}%
                  </span>
                ) : null}
                <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} className="w-full min-w-0" />
              </div>
            ) : null}
            {effectiveVariants.length > 1 ? (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {effectiveVariants.map((variant, idx) => (
                  <button
                    type="button"
                    key={variant.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      goToVariant(idx);
                    }}
                    className={`h-1.5 w-1.5 rounded-full ${idx === activeVariantIndex ? 'bg-[#16A34A]' : 'bg-slate-300'}`}
                  >
                    <span className="sr-only">{`Variant ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="absolute bottom-2 right-2 z-10">
              <ProductCardCartControl
                variantId={activeVariant.id}
                productId={id}
                sellingMode={sellingMode}
                unit={unitType}
                disabled={outOfStock}
              />
            </div>
          </div>
        ) : (
          <div className="h-28 rounded-2xl bg-gradient-to-br from-green-200 to-green-100" />
        )}
        <div className="px-3 pb-3 pt-2.5 sm:px-3.5">
          <h3 className="line-clamp-1 text-[13px] font-semibold text-[#121212]">{name}</h3>
          <p className="mt-0.5 line-clamp-1 min-h-4 text-[11px] font-medium text-slate-600">
            {activeVariant?.flavor ?? ''}
          </p>

          {inCart ? (
            <div className="mt-2 rounded-xl bg-emerald-50/90 px-2.5 py-2 ring-1 ring-emerald-100">
              <p className="text-[12px] font-bold leading-tight text-emerald-900">
                {formatSellingModeQuantity(activeQuantity, sellingMode, unitType)}
              </p>
              <p className="mt-0.5 text-[15px] font-extrabold tabular-nums tracking-tight text-[#121212]">
                {formatMoneyUz(lineTotal)}
              </p>
            </div>
          ) : activeVariant ? (
            activeDiscountPrice ? (
              <div className="mt-1.5 flex flex-col">
                <p className="text-[11px] font-medium leading-none text-slate-400 line-through opacity-80">
                  {formatMoneyUz(activeBasePrice)}
                </p>
                <p className="mt-0.5 text-[16px] font-bold leading-tight tracking-tight text-[#121212] tabular-nums">
                  {formatMoneyUz(activeDiscountPrice)}
                  <span className="ml-1 text-[11px] font-medium text-slate-500">
                    / {PRODUCT_UNIT_LABEL_UZ[unitType]}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-[16px] font-bold leading-tight tracking-tight text-[#121212] tabular-nums">
                {formatMoneyUz(activeBasePrice)}
                <span className="ml-1 text-[11px] font-medium text-slate-500">
                  / {PRODUCT_UNIT_LABEL_UZ[unitType]}
                </span>
              </p>
            )
          ) : (
            <p className="mt-1.5 text-[16px] font-bold leading-tight text-[#121212]">—</p>
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
  if ((prev.cashbackType ?? '') !== (next.cashbackType ?? '')) return false;
  if ((prev.cashbackValue ?? 0) !== (next.cashbackValue ?? 0)) return false;
  if ((prev.unit ?? '') !== (next.unit ?? '')) return false;
  if ((prev.sellingMode ?? '') !== (next.sellingMode ?? '')) return false;
  if ((prev.imageUrl ?? '') !== (next.imageUrl ?? '')) return false;
  return areVariantsEqual(prev.variants, next.variants);
}

export const ProductCard = memo(ProductCardBase, arePropsEqual);
