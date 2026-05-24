'use client';

import { memo, useState } from 'react';
import {
  DEFAULT_PRODUCT_UNIT,
  type ProductUnitCode,
  type SellingMode,
  normalizeIncomingProductUnit,
  resolveSellingMode,
} from '@onlinebozor/product-units';
import { SafeImage } from '@/components/safe-image';
import {
  PRODUCT_IMAGE_FALLBACK_CLASS,
  PRODUCT_IMAGE_SURFACE_CLASS,
  resolveProductImageUrl,
  resolveVariantImageUrl,
} from '@/lib/product-image';
import { buildProductCardMetaLine, buildProductCardUnitLine } from '@/lib/product-card-meta';
import { useProductSheet } from '@/lib/product-sheet-context';
import { ProductCardCartControl } from '@/components/product-card/product-card-cart-control';
import { ProductCardInfo } from '@/components/product-card/product-card-info';
import { ProductCardInCartRing } from '@/components/product-card/product-card-in-cart-ring';
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
  listingId?: string;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  purchasable?: boolean;
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
  discountEnabled?: boolean;
  discountedPrice?: number | null;
  promotionBadge?: 'HOT' | 'TOP' | 'YANGI' | 'AKSIYA' | 'PREMIUM' | null;
  promotionEnabled?: boolean;
  promotionStartAt?: string | null;
  promotionEndAt?: string | null;
  imagePriority?: boolean;
  topBadge?: string | null;
  cardVariant?: 'default' | 'top' | 'grid';
};

function ProductCardBase({
  id,
  listingId,
  storeId,
  storeName,
  storeSlug,
  purchasable = true,
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
  cashbackType,
  cashbackValue,
  discountEnabled,
  discountedPrice,
  promotionBadge,
  promotionEnabled,
  promotionStartAt,
  promotionEndAt,
  imagePriority = false,
  topBadge,
  cardVariant = 'default',
}: ProductCardProps) {
  const { openProduct } = useProductSheet();
  const productImages = { imageUrl: productImageUrl, imageCardUrl, imageThumbUrl };
  const unitType = normalizeIncomingProductUnit(unitProp) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = resolveSellingMode({ sellingMode: sellingModeProp, unit: unitProp ?? unitType });
  const effectiveVariants = variants ?? EMPTY_VARIANTS;
  const displayVariants =
    effectiveVariants.length > 0
      ? effectiveVariants
      : resolveProductImageUrl(productImages)
        ? [
            {
              id: listingId ?? id,
              price,
              stock: 0,
              imageUrl: resolveProductImageUrl(productImages),
            },
          ]
        : EMPTY_VARIANTS;
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [variantSig, setVariantSig] = useState(() => keyOfVariants(displayVariants));

  const currentSig = keyOfVariants(displayVariants);
  if (currentSig !== variantSig) {
    setVariantSig(currentSig);
    setActiveVariantIndex(0);
  }

  const activeVariant =
    displayVariants.length > 0
      ? displayVariants[Math.min(activeVariantIndex, displayVariants.length - 1)]
      : null;

  const activeVariantId = activeVariant?.id ?? '';

  const activeBasePrice = Number(activeVariant?.price ?? price);
  const activeDiscountPrice =
    activeVariant?.discountPrice && activeVariant.discountPrice > 0 && activeVariant.discountPrice < activeBasePrice
      ? Number(activeVariant.discountPrice)
      : null;
  const now = Date.now();
  const inPromoWindow =
    !promotionEnabled ||
    ((promotionStartAt ? new Date(promotionStartAt).getTime() <= now : true) &&
      (promotionEndAt ? new Date(promotionEndAt).getTime() >= now : true));
  const productDiscountPrice =
    discountEnabled && inPromoWindow && discountedPrice && discountedPrice > 0 && discountedPrice < activeBasePrice
      ? Number(discountedPrice)
      : null;
  const effectiveDiscountPrice = activeDiscountPrice ?? productDiscountPrice;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageKey, setImageKey] = useState(activeVariantId ?? '');
  if (activeVariantId && activeVariantId !== imageKey) {
    setImageKey(activeVariantId);
    setImageLoaded(false);
  }

  const goToVariant = (targetIndex: number) => {
    if (!displayVariants.length) return;
    setActiveVariantIndex(Math.max(0, Math.min(targetIndex, displayVariants.length - 1)));
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
  const cartDisabled = outOfStock || purchasable === false;

  const metaLine = buildProductCardMetaLine({
    flavor: activeVariant?.flavor,
    subtitle,
    description: activeVariant?.description,
    categoryName,
    unit: unitType,
    minimumAmount,
    stepAmount,
  });
  const unitLine = buildProductCardUnitLine({
    unit: unitType,
    minimumAmount,
    stepAmount,
  });

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
    cashbackType,
    cashbackValue,
    discountEnabled,
    discountedPrice,
    promotionBadge,
    promotionEnabled,
    promotionStartAt,
    promotionEndAt,
    stock: activeVariant?.stock,
    variants: displayVariants.map((v) => ({
      id: v.id,
      flavor: v.flavor,
      description: v.description,
      price: Number(v.price),
      discountPrice: v.discountPrice,
      stock: v.stock ?? 0,
      imageUrl: v.imageUrl,
    })),
    listingId,
    storeId,
    storeName,
    storeSlug,
    purchasable,
  };

  const openSheet = () => openProduct(storefrontProduct);

  const isTopCard = cardVariant === 'top';
  const isGridCard = cardVariant === 'grid';
  const imageSizeClass = isTopCard
    ? 'max-h-[100%] max-w-[100%]'
    : isGridCard
      ? 'max-h-[82%] max-w-[82%]'
      : 'max-h-[96%] max-w-[96%]';
  const imageSurfaceClass = PRODUCT_IMAGE_SURFACE_CLASS;

  return (
    <article
      className={`product-card flex h-full flex-col ${isTopCard ? 'product-card--top' : ''} ${isGridCard ? 'product-card--grid' : ''}`}
    >
      <ProductCardInCartRing variant={isGridCard ? 'grid' : 'default'}>
        <button
          type="button"
          onClick={openSheet}
          className={`product-card-surface flex h-full flex-col text-left ${
            isGridCard
              ? 'bg-transparent'
              : 'bg-white transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100'
          }`}
        >
          {activeVariant ? (
            <div
              className={`relative aspect-square w-full shrink-0 overflow-hidden ${isGridCard ? 'rounded-2xl' : 'rounded-xl'} ${imageSurfaceClass}`}
              onTouchStart={
                isGridCard
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      setTouchStartX(e.changedTouches[0]?.clientX ?? null);
                    }
              }
              onTouchEnd={
                isGridCard
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      handleTouchEnd(e.changedTouches[0]?.clientX ?? 0);
                    }
              }
            >
              {!imageLoaded ? (
                <div className={`absolute inset-0 animate-pulse ${PRODUCT_IMAGE_SURFACE_CLASS}`} />
              ) : null}
              <div
                className="flex h-full w-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeVariantIndex * 100}%)` }}
              >
                {displayVariants.map((variant) => {
                  const src = resolveVariantImageUrl(variant, productImages);
                  return (
                    <div
                      key={variant.id}
                      className={`flex h-full min-w-full items-center justify-center ${isGridCard ? 'p-2' : 'px-1 pt-0.5'}`}
                    >
                      <SafeImage
                        src={src || undefined}
                        alt={variant.flavor || name}
                        loading={imagePriority ? 'eager' : 'lazy'}
                        sizes={isGridCard ? '(max-width: 768px) 33vw, 140px' : '(max-width: 768px) 50vw, 200px'}
                        decoding="async"
                        className={`${imageSizeClass} object-contain transition-opacity duration-300 ${
                          imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        fallbackClassName={PRODUCT_IMAGE_FALLBACK_CLASS}
                        onReady={() => setImageLoaded(true)}
                      />
                    </div>
                  );
                })}
              </div>

              {topBadge ? (
                <span className="pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  {topBadge}
                </span>
              ) : null}
              {effectiveDiscountPrice ? (
                <span
                  className={`pointer-events-none absolute z-[1] font-bold text-white ${
                    isGridCard
                      ? 'bottom-1.5 left-1.5 rounded-md bg-[#ef4444] px-1 py-0.5 text-[10px]'
                      : `rounded-md bg-[#ef4444] px-1.5 py-0.5 text-[9px] ${topBadge ? 'left-1.5 top-7' : 'left-1.5 top-1.5'}`
                  }`}
                >
                  -{Math.max(1, Math.round(((activeBasePrice - effectiveDiscountPrice) / activeBasePrice) * 100))}%
                </span>
              ) : null}
              {promotionBadge && inPromoWindow ? (
                <span className="pointer-events-none absolute right-1.5 top-1.5 z-[1] rounded-md bg-[#111827] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {promotionBadge}
                </span>
              ) : null}

              <div
                className={`absolute z-10 flex justify-end ${
                  isGridCard ? 'bottom-1.5 right-1.5 max-w-[calc(100%-12px)]' : 'bottom-1 right-1 max-w-[calc(100%-6px)]'
                }`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <ProductCardCartControl
                  variantId={activeVariant.id}
                  productId={id}
                  sellingMode={sellingMode}
                  unit={unitType}
                  disabled={cartDisabled}
                  storeId={storeId}
                  storeName={storeName}
                  storeSlug={storeSlug}
                  listingId={listingId}
                  addButtonTone={isGridCard ? 'dark' : 'green'}
                  addButtonSize={isGridCard ? 'compact' : 'default'}
                />
              </div>
            </div>
          ) : (
            <div className={`aspect-square w-full shrink-0 ${PRODUCT_IMAGE_SURFACE_CLASS}`} />
          )}

          <ProductCardInfo
            name={name}
            metaLine={metaLine}
            unitLine={unitLine}
            basePrice={activeBasePrice}
            salePrice={effectiveDiscountPrice}
            cashbackType={cashbackType}
            cashbackValue={cashbackValue}
            layout={isGridCard ? 'grid' : 'default'}
          />
        </button>
      </ProductCardInCartRing>
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
  if ((prev.cashbackType ?? '') !== (next.cashbackType ?? '')) return false;
  if ((prev.cashbackValue ?? 0) !== (next.cashbackValue ?? 0)) return false;
  if ((prev.discountEnabled ?? false) !== (next.discountEnabled ?? false)) return false;
  if ((prev.discountedPrice ?? 0) !== (next.discountedPrice ?? 0)) return false;
  if ((prev.promotionBadge ?? '') !== (next.promotionBadge ?? '')) return false;
  if ((prev.promotionEnabled ?? false) !== (next.promotionEnabled ?? false)) return false;
  if ((prev.promotionStartAt ?? '') !== (next.promotionStartAt ?? '')) return false;
  if ((prev.promotionEndAt ?? '') !== (next.promotionEndAt ?? '')) return false;
  if ((prev.imagePriority ?? false) !== (next.imagePriority ?? false)) return false;
  if ((prev.topBadge ?? '') !== (next.topBadge ?? '')) return false;
  if ((prev.cardVariant ?? 'default') !== (next.cardVariant ?? 'default')) return false;
  return areVariantsEqual(prev.variants, next.variants);
}

export const ProductCard = memo(ProductCardBase, arePropsEqual);
