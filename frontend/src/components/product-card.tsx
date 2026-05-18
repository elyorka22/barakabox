'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import {
  DEFAULT_PRODUCT_UNIT,
  type ProductUnitCode,
  type SellingMode,
  normalizeIncomingProductUnit,
  calculateSellingModeLineTotal,
  formatSellingModeQuantity,
  resolveSellingMode,
} from '@onlinebozor/product-units';
import { SafeImage } from '@/components/safe-image';
import { getCashbackPromoLabel } from '@/lib/cashback';
import { CashbackBadge } from '@/components/cashback-badge';
import { useCartQuantity } from '@/lib/use-cart-store';
import { ProductCardCartControl } from '@/components/product-card/product-card-cart-control';
import { ProductCardCartSummary } from '@/components/product-card/product-card-cart-summary';
import { ProductCardPrice } from '@/components/product-card/product-card-price';

type Variant = {
  id: string;
  flavor?: string | null;
  description?: string | null;
  price: string | number;
  discountPrice?: number | null;
  stock?: number;
  imageUrl?: string | null;
};

export type ProductCardProps = {
  id: string;
  name: string;
  price: string;
  unit?: ProductUnitCode | string | null;
  sellingMode?: SellingMode | string | null;
  subtitle?: string | null;
  categoryName?: string | null;
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
  subtitle,
  categoryName,
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

  const displayQuantity = activeQuantity;
  const quantityLabel = formatSellingModeQuantity(displayQuantity, sellingMode, unitType);
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

  const metaLine =
    activeVariant?.flavor?.trim() ||
    subtitle?.trim() ||
    categoryName?.trim() ||
    '';

  return (
    <article
      className={`product-card group flex h-full flex-col overflow-hidden rounded-[24px] bg-white transition-all duration-300 ${
        inCart
          ? 'shadow-[0_8px_28px_rgba(34,197,94,0.14)] ring-2 ring-[#22c55e]/20'
          : 'shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]'
      }`}
    >
      <Link href={href ?? '#'} className="flex min-h-0 flex-1 flex-col">
        {activeVariant ? (
          <div
            className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-white"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {!imageLoaded ? (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#f9fafb] to-white" />
            ) : null}
            <div
              className="relative flex h-full w-full bg-white transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
            >
              {effectiveVariants.map((variant) => (
                <div key={variant.id} className="flex h-full min-w-full items-center justify-center px-3 pt-2">
                  <SafeImage
                    src={variant.imageUrl ?? undefined}
                    alt={variant.flavor || name}
                    loading="lazy"
                    decoding="async"
                    className="max-h-[88%] w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
                    fallbackClassName="h-full w-full bg-gradient-to-br from-[#ecfdf3] to-white"
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              ))}
            </div>

            {cashbackPromo || activeDiscountPrice ? (
              <div className="pointer-events-none absolute left-2.5 top-2.5 z-[5] flex max-w-[calc(100%-4.5rem)] flex-col gap-1">
                {activeDiscountPrice ? (
                  <span className="inline-flex w-max items-center rounded-full bg-[#ef4444] px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                    -{Math.max(1, Math.round(((activeBasePrice - activeDiscountPrice) / activeBasePrice) * 100))}%
                  </span>
                ) : null}
                <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} className="w-full min-w-0" />
              </div>
            ) : null}

            {effectiveVariants.length > 1 ? (
              <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5">
                {effectiveVariants.map((variant, idx) => (
                  <button
                    type="button"
                    key={variant.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      goToVariant(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      idx === activeVariantIndex ? 'w-4 bg-[#22c55e]' : 'w-1.5 bg-[#d1d5db]'
                    }`}
                  >
                    <span className="sr-only">{`Variant ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="absolute bottom-2.5 right-2.5 z-10">
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
          <div className="aspect-[4/5] shrink-0 bg-gradient-to-br from-[#ecfdf3] to-white" />
        )}

        <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-[#111827]">
            {name}
          </h3>
          {metaLine ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-[#6b7280]">{metaLine}</p>
          ) : (
            <p className="mt-0.5 min-h-[1rem]" aria-hidden />
          )}

          {!inCart && activeVariant ? (
            <ProductCardPrice
              basePrice={activeBasePrice}
              salePrice={activeDiscountPrice}
              unit={unitType}
              compact
            />
          ) : (
            <div className="mt-1 min-h-[2.5rem]" aria-hidden />
          )}

          <ProductCardCartSummary
            quantityLabel={quantityLabel}
            lineTotal={lineTotal}
            visible={inCart}
          />
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
  if ((prev.subtitle ?? '') !== (next.subtitle ?? '')) return false;
  if ((prev.categoryName ?? '') !== (next.categoryName ?? '')) return false;
  if ((prev.imageUrl ?? '') !== (next.imageUrl ?? '')) return false;
  return areVariantsEqual(prev.variants, next.variants);
}

export const ProductCard = memo(ProductCardBase, arePropsEqual);
