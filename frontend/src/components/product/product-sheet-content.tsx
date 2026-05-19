'use client';

import { useEffect, useMemo, useState } from 'react';
import { SafeImage } from '@/components/safe-image';
import { formatMoneyUz } from '@/lib/format';
import {
  PRODUCT_IMAGE_FALLBACK_CLASS,
  PRODUCT_IMAGE_SURFACE_CLASS,
  resolveVariantImageUrl,
} from '@/lib/product-image';
import type { StorefrontProduct } from '@/types/storefront-product';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL_UZ,
  normalizedProductSaleUnit,
} from '@onlinebozor/product-units';

type Props = {
  product: StorefrontProduct;
};

export function ProductSheetContent({ product }: Props) {
  const [imageReady, setImageReady] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  const variants = product.variants ?? [];
  const activeVariant = variants[variantIndex] ?? null;
  const saleUnit = normalizedProductSaleUnit(product) ?? DEFAULT_PRODUCT_UNIT;
  const unitLabel = PRODUCT_UNIT_LABEL_UZ[saleUnit];

  useEffect(() => {
    setVariantIndex(0);
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

  const subtitle =
    activeVariant?.flavor?.trim() || activeVariant?.description?.trim() || '';
  const longDescription = activeVariant?.description?.trim() ?? '';
  const showDescription =
    longDescription.length > 0 &&
    longDescription !== subtitle &&
    longDescription.length > subtitle.length + 8;

  return (
    <div className="px-4 pb-5 pt-0">
      <div
        className={`relative mx-auto aspect-[5/4] w-full max-w-[320px] overflow-hidden rounded-2xl ${PRODUCT_IMAGE_SURFACE_CLASS}`}
      >
        {!imageReady ? (
          <div className={`pointer-events-none absolute inset-0 z-[1] animate-pulse ${PRODUCT_IMAGE_SURFACE_CLASS}`} />
        ) : null}
        <SafeImage
          key={imageSrc || activeVariant?.id || product.id}
          src={imageSrc || undefined}
          alt={product.name}
          loading="eager"
          decoding="async"
          className={`h-full w-full object-contain p-2 transition-opacity duration-300 ${
            imageReady ? 'opacity-100' : 'opacity-0'
          }`}
          fallbackClassName={PRODUCT_IMAGE_FALLBACK_CLASS}
          onReady={() => setImageReady(true)}
        />
      </div>

      {variants.length > 1 ? (
        <div className="bb-scrollbar-hide mt-2 flex gap-1.5 overflow-x-auto">
          {variants.map((v, idx) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantIndex(idx)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                idx === variantIndex
                  ? 'bg-[#22c55e] text-white'
                  : 'bg-white text-[#6b7280] ring-1 ring-[#e5e7eb]'
              }`}
            >
              {v.flavor ?? `№${idx + 1}`}
            </button>
          ))}
        </div>
      ) : null}

      <h2 className="mt-2.5 text-[17px] font-bold leading-snug text-[#111827]">{product.name}</h2>
      {subtitle ? (
        <p className="mt-0.5 line-clamp-2 text-[12px] text-[#9ca3af]">{subtitle}</p>
      ) : null}

      <div className="mt-2">
        {salePrice ? (
          <p className="text-[12px] font-medium text-[#9ca3af] line-through">
            {formatMoneyUz(basePrice)}
          </p>
        ) : null}
        <p className="text-[22px] font-bold leading-none tabular-nums text-[#111827]">
          {formatMoneyUz(unitPrice)}
          <span className="ml-1 text-[13px] font-medium text-[#9ca3af]">/ {unitLabel}</span>
        </p>
      </div>

      {showDescription ? (
        <p className="mt-2.5 text-[12px] leading-relaxed text-[#6b7280]">{longDescription}</p>
      ) : null}
    </div>
  );
}
