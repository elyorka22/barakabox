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
import { useCartQuantity } from '@/lib/use-cart-store';
import { ProductCardCartControl } from '@/components/product-card/product-card-cart-control';
import { ProductCardFooter } from '@/components/product-card/product-card-footer';

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
}: ProductCardProps) {
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

  const quantityLabel = formatSellingModeQuantity(activeQuantity, sellingMode, unitType);
  const lineTotal = useMemo(
    () => calculateSellingModeLineTotal(unitPrice, activeQuantity, sellingMode),
    [unitPrice, activeQuantity, sellingMode],
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
    goToVariant(diff > 0 ? activeVariantIndex + 1 : activeVariantIndex - 1);
    setTouchStartX(null);
  };

  const outOfStock = activeVariant ? (activeVariant.stock ?? 0) <= 0 : true;
  const inCart = activeQuantity > 0;

  const subtitleLine =
    activeVariant?.flavor?.trim() || subtitle?.trim() || categoryName?.trim() || '';

  return (
    <article className="product-card flex h-full flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <Link href={href ?? '#'} className="flex min-h-0 flex-1 flex-col">
        {activeVariant ? (
          <div
            className="relative aspect-square w-full shrink-0 overflow-hidden bg-white"
            onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0]?.clientX ?? 0)}
          >
            {!imageLoaded ? <div className="absolute inset-0 bg-[#fafafa]" /> : null}
            <div
              className="flex h-full w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
            >
              {effectiveVariants.map((variant) => (
                <div key={variant.id} className="flex h-full min-w-full items-center justify-center p-2">
                  <SafeImage
                    src={variant.imageUrl ?? undefined}
                    alt={variant.flavor || name}
                    loading="lazy"
                    decoding="async"
                    className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    fallbackClassName="h-full w-full bg-[#fafafa]"
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              ))}
            </div>

            {activeDiscountPrice ? (
              <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[#ef4444] px-1.5 py-0.5 text-[9px] font-bold text-white">
                -{Math.max(1, Math.round(((activeBasePrice - activeDiscountPrice) / activeBasePrice) * 100))}%
              </span>
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
          <div className="aspect-square shrink-0 bg-[#fafafa]" />
        )}

        <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-[1.15] text-[#111827]">{name}</h3>
          {subtitleLine ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-[#9ca3af]">{subtitleLine}</p>
          ) : null}

          <ProductCardFooter
            inCart={inCart}
            quantityLabel={quantityLabel}
            lineTotal={lineTotal}
            basePrice={activeBasePrice}
            salePrice={activeDiscountPrice}
            unit={unitType}
          />
        </div>
      </Link>
    </article>
  );
}

const EMPTY_VARIANTS: Variant[] = [];

function keyOfVariants(list: Variant[]): string {
  if (!list.length) return '';
  return list.map((v) => `${v.id}:${v.imageUrl ?? ''}`).join('|');
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
  if ((prev.unit ?? '') !== (next.unit ?? '')) return false;
  if ((prev.sellingMode ?? '') !== (next.sellingMode ?? '')) return false;
  if ((prev.subtitle ?? '') !== (next.subtitle ?? '')) return false;
  if ((prev.categoryName ?? '') !== (next.categoryName ?? '')) return false;
  return areVariantsEqual(prev.variants, next.variants);
}

export const ProductCard = memo(ProductCardBase, arePropsEqual);
