'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { SafeImage } from '@/components/safe-image';
import { QuantitySelector } from '@/components/quantity-selector';
import { incrementCart } from '@/lib/cart-store';
import { resolveVariantImageUrl } from '@/lib/product-image';
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

type Product = {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  imageThumbUrl?: string | null;
  unit?: string | null;
  unitType?: string | null;
  sellingMode?: string | null;
  variants?: Array<{
    id: string;
    flavor?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
};

export default function ProductDetailClientPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(() => getSellingModeMin('piece'));
  const [imageReady, setImageReady] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const list = await api.get<Product[]>('/products');
      setProduct(list.find((p) => p.id === params.id) ?? null);
    };
    void load();
  }, [params.id]);

  const activeVariant = product?.variants?.[variantIndex] ?? null;
  const variants = product?.variants ?? [];
  const saleUnit = normalizedProductSaleUnit(product) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = resolveSellingMode(product);

  useEffect(() => {
    setVariantIndex(0);
    setQuantity(getSellingModeMin(resolveSellingMode(product)));
  }, [product?.id, product]);

  const imageSrc = useMemo(
    () => resolveVariantImageUrl(activeVariant, product),
    [activeVariant, product],
  );

  useEffect(() => {
    setImageReady(false);
  }, [imageSrc, activeVariant?.id]);

  const basePrice = Number(activeVariant?.price ?? product?.price ?? 0);
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

  const quantityMin = getSellingModeMin(sellingMode);
  const quantityStep = getSellingModeStep(sellingMode);
  const quantityLabel = formatSellingModeQuantity(quantity, sellingMode, saleUnit);
  const outOfStock = (activeVariant?.stock ?? 0) <= 0;
  const unitHint = formatSellingModeQuantity(quantityMin, sellingMode, saleUnit);

  const addToCart = () => {
    if (!product || !activeVariant?.id || outOfStock) return;
    incrementCart(activeVariant.id, product.id, quantity);
  };

  return (
    <main className="min-h-dvh bg-white pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 flex items-center bg-white/95 px-2 py-2 backdrop-blur-md">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#111827] transition active:bg-[#f3f4f6]"
          aria-label="Orqaga"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </Link>
      </header>

      <div className="px-4">
        <div className="relative mx-auto mb-2 aspect-square w-full max-w-[min(100%,340px)] overflow-hidden rounded-2xl bg-[#fafafa]">
          {!imageReady ? (
            <div className="pointer-events-none absolute inset-0 z-[1] animate-pulse bg-[#f5f5f5]" />
          ) : null}
          <SafeImage
            key={imageSrc || activeVariant?.id || product?.id}
            src={imageSrc || undefined}
            alt={product?.name ?? 'Mahsulot'}
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
          <div className="bb-scrollbar-hide -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
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

        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#111827]">
          {product?.name ?? 'Mahsulot'}
        </h1>

        {activeVariant?.flavor && variants.length <= 1 ? (
          <p className="mt-0.5 text-[13px] font-medium text-[#9ca3af]">{activeVariant.flavor}</p>
        ) : null}

        <p className="mt-1 text-[13px] text-[#9ca3af]">{unitHint}</p>

        <div className="mt-3">
          {salePrice ? (
            <p className="text-[13px] font-medium text-[#9ca3af] line-through">
              {formatMoneyUz(basePrice)}
            </p>
          ) : null}
          <p className="text-[28px] font-bold leading-none tabular-nums tracking-tight text-[#111827]">
            {formatMoneyUz(unitPrice)}
          </p>
          <p className="mt-1 text-[13px] text-[#9ca3af]">
            / {PRODUCT_UNIT_LABEL_UZ[saleUnit]}
          </p>
        </div>

        <div className="mt-8">
          <QuantitySelector
            variant="detail"
            displayLabel={quantityLabel}
            disabled={outOfStock}
            onDecrease={() =>
              setQuantity((q) => {
                const delta = getSellingModeDecreaseDelta(q, sellingMode);
                const next = q + delta;
                return next < quantityMin ? quantityMin : next;
              })
            }
            onIncrease={() => setQuantity((q) => q + quantityStep)}
          />
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-30 px-4 pt-2"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={addToCart}
          disabled={!product || outOfStock}
          className="detail-cta-btn w-full rounded-[24px] bg-[#22c55e] py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {outOfStock
            ? 'Hozircha mavjud emas'
            : `Savatga qo'shish • ${formatMoneyUz(total)}`}
        </button>
      </div>
    </main>
  );
}
