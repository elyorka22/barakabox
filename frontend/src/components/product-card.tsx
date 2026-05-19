'use client';

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
import {
  PRODUCT_IMAGE_FALLBACK_CLASS,
  PRODUCT_IMAGE_SURFACE_CLASS,
  resolveVariantImageUrl,
} from '@/lib/product-image';
import { useProductSheet } from '@/lib/product-sheet-context';
import { useCartQuantity } from '@/lib/use-cart-store';
import { ProductCardCartControl } from '@/components/product-card/product-card-cart-control';
import { ProductCardFooter } from '@/components/product-card/product-card-footer';
import type { StorefrontProduct } from '@/types/storefront-product';

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
  stepAmount?: number | null;
  minimumAmount?: number | null;
  subtitle?: string | null;
  categoryName?: string | null;
  variants?: Variant[];
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  imageThumbUrl?: string | null;
  cashbackType?: string | null;
  cashbackValue?: number | null;
};

function ProductCardBase({
  id,
  name,
  price,
  unit: unitProp,
  sellingMode: sellingModeProp,
  stepAmount,
  minimumAmount,
  subtitle,
  categoryName,
  variants,
  imageUrl: productImageUrl,
  imageCardUrl,
  imageThumbUrl,
}: ProductCardProps) {
  const { openProduct } = useProductSheet();
  const productImages = { imageUrl: productImageUrl, imageCardUrl, imageThumbUrl };
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

  const storefrontProduct: StorefrontProduct = {
    id,
    name,
    price,
    unit: unitProp,
    sellingMode: sellingModeProp,
    stepAmount,
    minimumAmount,
    imageUrl: productImageUrl,
    imageCardUrl,
    imageThumbUrl,
    variants: effectiveVariants.map((v) => ({
      id: v.id,
      flavor: v.flavor,
      description: v.description,
      price: Number(v.price),
      discountPrice: v.discountPrice,
      stock: v.stock ?? 0,
      imageUrl: v.imageUrl,
    })),
  };

  const openSheet = () => openProduct(storefrontProduct);

  return (
    <article
      className={`product-card flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-shadow duration-200 ${
        inCart ? 'ring-2 ring-[#22c55e]/30' : ''
      }`}
    >
      <button
        type="button"
        onClick={openSheet}
        className="flex min-h-0 flex-1 flex-col text-left"
      >
        {activeVariant ? (
          <div
            className={`relative aspect-square w-full shrink-0 overflow-hidden ${PRODUCT_IMAGE_SURFACE_CLASS}`}
            onTouchStart={(e) => {
              e.stopPropagation();
              setTouchStartX(e.changedTouches[0]?.clientX ?? null);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleTouchEnd(e.changedTouches[0]?.clientX ?? 0);
            }}
          >
            {!imageLoaded ? (
              <div className={`absolute inset-0 animate-pulse ${PRODUCT_IMAGE_SURFACE_CLASS}`} />
            ) : null}
            <div
              className="flex h-full w-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
            >
              {effectiveVariants.map((variant) => {
                const src = resolveVariantImageUrl(variant, productImages);
                return (
                  <div key={variant.id} className="flex h-full min-w-full items-center justify-center p-1">
                    <SafeImage
                      src={src || undefined}
                      alt={variant.flavor || name}
                      loading="lazy"
                      decoding="async"
                      className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      fallbackClassName={PRODUCT_IMAGE_FALLBACK_CLASS}
                      onReady={() => setImageLoaded(true)}
                    />
                  </div>
                );
              })}
            </div>

            {activeDiscountPrice ? (
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-[#ef4444] px-1.5 py-0.5 text-[9px] font-bold text-white">
                -{Math.max(1, Math.round(((activeBasePrice - activeDiscountPrice) / activeBasePrice) * 100))}%
              </span>
            ) : null}

            <div className="absolute bottom-1.5 right-1.5 z-10" onClick={(e) => e.stopPropagation()}>
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
          <div className={`aspect-square shrink-0 ${PRODUCT_IMAGE_SURFACE_CLASS}`} />
        )}

        <div className="flex flex-1 flex-col px-2 pb-1.5 pt-1">
          <h3 className="line-clamp-2 text-[12px] font-bold leading-tight text-[#111827]">{name}</h3>
          {subtitleLine ? (
            <p className="mt-px line-clamp-1 text-[10px] text-[#9ca3af]">{subtitleLine}</p>
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
      </button>
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
  if ((prev.stepAmount ?? '') !== (next.stepAmount ?? '')) return false;
  if ((prev.minimumAmount ?? '') !== (next.minimumAmount ?? '')) return false;
  if ((prev.subtitle ?? '') !== (next.subtitle ?? '')) return false;
  if ((prev.categoryName ?? '') !== (next.categoryName ?? '')) return false;
  if ((prev.imageUrl ?? '') !== (next.imageUrl ?? '')) return false;
  if ((prev.imageCardUrl ?? '') !== (next.imageCardUrl ?? '')) return false;
  if ((prev.imageThumbUrl ?? '') !== (next.imageThumbUrl ?? '')) return false;
  return areVariantsEqual(prev.variants, next.variants);
}

export const ProductCard = memo(ProductCardBase, arePropsEqual);
