'use client';

import { useEffect, useMemo, useState } from 'react';
import { SafeImage } from '@/components/safe-image';
import { QuantitySelector } from '@/components/quantity-selector';
import { incrementCart } from '@/lib/cart-store';
import { formatMoneyUz } from '@/lib/format';
import { resolveVariantImageUrl } from '@/lib/product-image';
import type { StorefrontProduct } from '@/types/storefront-product';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL_UZ,
  calculateSellingModeLineTotal,
  formatSellingModeQuantity,
  getSellingModeDecreaseDelta,
  getSellingModeMin,
  getSellingModeStep,
  normalizedProductSaleUnit,
  resolveSellingMode,
} from '@onlinebozor/product-units';

type Props = {
  product: StorefrontProduct;
  onAdded?: () => void;
};

export function ProductSheetContent({ product, onAdded }: Props) {
  const [quantity, setQuantity] = useState(() => getSellingModeMin('piece'));
  const [imageReady, setImageReady] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  const activeVariant = product.variants?.[variantIndex] ?? null;
  const variants = product.variants ?? [];
  const saleUnit = normalizedProductSaleUnit(product) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = resolveSellingMode(product);

  useEffect(() => {
    setVariantIndex(0);
    setQuantity(getSellingModeMin(resolveSellingMode(product), product));
  }, [product.id]);

  const imageSrc = useMemo(
    () => resolveVariantImageUrl(activeVariant, product),
    [activeVariant, product],
  );

  useEffect(() => {
    setImageReady(false);
  }, [imageSrc, activeVariant?.id]);

  const basePrice = Number(activeVariant?.price ?? product.price ?? 0);
  const salePrice =
    activeVariant?.discountPrice &&
    Number(activeVariant.discountPrice) > 0 &&
    Number(activeVariant.discountPrice) < basePrice
      ? Number(activeVariant.discountPrice)
      : null;
  const unitPrice = salePrice ?? basePrice;

  const total = useMemo(
    () => calculateSellingModeLineTotal(unitPrice, quantity, sellingMode),
    [unitPrice, quantity, sellingMode],
  );

  const quantityMin = getSellingModeMin(sellingMode, product);
  const quantityStep = getSellingModeStep(sellingMode, product);
  const quantityLabel = formatSellingModeQuantity(quantity, sellingMode, saleUnit);
  const outOfStock = (activeVariant?.stock ?? 0) <= 0;
  const unitHint = formatSellingModeQuantity(quantityMin, sellingMode, saleUnit);
  const subtitle =
    activeVariant?.flavor?.trim() || activeVariant?.description?.trim() || '';

  const addToCart = () => {
    if (!activeVariant?.id || outOfStock) return;
    incrementCart(activeVariant.id, product.id, quantity);
    onAdded?.();
  };

  return (
    <div className="flex max-h-[min(85dvh,640px)] flex-col">
      <div className="bb-scrollbar-hide flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-2xl bg-[#fafafa]">
          {!imageReady ? (
            <div className="pointer-events-none absolute inset-0 z-[1] animate-pulse bg-[#f5f5f5]" />
          ) : null}
          <SafeImage
            key={imageSrc || activeVariant?.id || product.id}
            src={imageSrc || undefined}
            alt={product.name}
            loading="eager"
            decoding="async"
            className={`h-full w-full object-contain p-3 transition-opacity duration-300 ${
              imageReady ? 'opacity-100' : 'opacity-0'
            }`}
            fallbackClassName="flex h-full w-full items-center justify-center bg-[#fafafa]"
            onReady={() => setImageReady(true)}
          />
        </div>

        {variants.length > 1 ? (
          <div className="bb-scrollbar-hide -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
            {variants.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantIndex(idx)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  idx === variantIndex
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-[#f3f4f6] text-[#6b7280]'
                }`}
              >
                {v.flavor ?? `№${idx + 1}`}
              </button>
            ))}
          </div>
        ) : null}

        <h2 className="mt-3 text-[20px] font-bold leading-tight text-[#111827]">{product.name}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] font-medium text-[#9ca3af]">{subtitle}</p>
        ) : null}
        <p className="mt-1 text-[12px] text-[#9ca3af]">{unitHint}</p>

        <div className="mt-3">
          {salePrice ? (
            <p className="text-[13px] font-medium text-[#9ca3af] line-through">
              {formatMoneyUz(basePrice)}
            </p>
          ) : null}
          <p className="text-[26px] font-bold leading-none tabular-nums text-[#111827]">
            {formatMoneyUz(unitPrice)}
          </p>
          <p className="mt-0.5 text-[12px] text-[#9ca3af]">/ {PRODUCT_UNIT_LABEL_UZ[saleUnit]}</p>
        </div>

        <div className="mt-6">
          <QuantitySelector
            variant="detail"
            displayLabel={quantityLabel}
            disabled={outOfStock}
            onDecrease={() =>
              setQuantity((q) => {
                const delta = getSellingModeDecreaseDelta(q, sellingMode, product);
                const next = q + delta;
                return next < quantityMin ? quantityMin : next;
              })
            }
            onIncrease={() => setQuantity((q) => q + quantityStep)}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-[#f3f4f6] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={addToCart}
          disabled={!activeVariant?.id || outOfStock}
          className="w-full rounded-[22px] bg-[#22c55e] py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(34,197,94,0.32)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {outOfStock
            ? 'Hozircha mavjud emas'
            : `Savatga qo'shish • ${formatMoneyUz(total)}`}
        </button>
      </div>
    </div>
  );
}
