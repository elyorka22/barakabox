'use client';

import { Trash2 } from 'lucide-react';
import { CashbackBadge } from '@/components/cashback-badge';
import { QuantitySelector } from '@/components/quantity-selector';
import { SafeImage } from '@/components/safe-image';
import { formatMoneyUz } from '@/lib/format';
import type { CartItem } from '@/lib/cart-store';
import { adjustCart, deleteCartLine } from '@/lib/cart-store';
import {
  PRODUCT_IMAGE_FALLBACK_CLASS,
  PRODUCT_IMAGE_SURFACE_CLASS,
  resolveVariantImageUrl,
} from '@/lib/product-image';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL_UZ,
  formatSellingModeQuantity,
  getSellingModeMin,
  normalizedProductSaleUnit,
  resolveSellingMode,
} from '@onlinebozor/product-units';
import { useCartPending, useCartQuantity } from '@/lib/use-cart-store';
import { cartLineBaseUnitPrice, cartLineTotal, cartLineUnitPrice } from '@/lib/cart-totals';

function discountPercentLabel(base: number, sale: number): string | null {
  if (base <= 0 || sale >= base) return null;
  const p = Math.round(((base - sale) / base) * 100);
  if (p <= 0) return null;
  return `-${p}%`;
}

type CartLineCardProps = {
  item: CartItem;
};

export function CartLineCard({ item }: CartLineCardProps) {
  const variantId = item.variant?.id;
  const productId = item.product?.id ?? item.variant?.product?.id;
  const liveQuantity = useCartQuantity(variantId);
  const pending = useCartPending(variantId);
  const displayedQuantity = variantId ? liveQuantity : item.quantity;
  const title = item.product?.name ?? item.variant?.product?.name ?? item.box?.name ?? 'Nomaʼlum';
  const unitPrice = cartLineUnitPrice(item);
  const baseUnit = cartLineBaseUnitPrice(item);
  const subtitle = item.variant?.flavor ?? item.variant?.title ?? (item.box ? 'Set' : '');
  const productForMode = item.variant?.product ?? item.product;
  const unit =
    normalizedProductSaleUnit(productForMode ?? undefined) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = item.box ? 'piece' : resolveSellingMode(productForMode);
  const unitLabel = PRODUCT_UNIT_LABEL_UZ[unit];
  const quantityLabel = formatSellingModeQuantity(displayedQuantity, sellingMode, unit);
  const lineTotal = cartLineTotal(item, displayedQuantity);
  const productForCashback = item.variant?.product ?? item.product;
  const cashbackType = productForCashback?.cashbackType ?? 'NONE';
  const cashbackValue = Number(productForCashback?.cashbackValue ?? 0);
  const discountLabel = item.variant ? discountPercentLabel(baseUnit, unitPrice) : null;
  const imageSrc = resolveVariantImageUrl(item.variant, null);

  const handleDecrease = () => {
    if (!variantId || !productId) return;
    if (displayedQuantity <= getSellingModeMin(sellingMode)) {
      void deleteCartLine(variantId, productId);
      return;
    }
    adjustCart(variantId, productId, sellingMode, 'decrease');
  };

  const handleIncrease = () => {
    if (!variantId || !productId) return;
    adjustCart(variantId, productId, sellingMode, 'increase');
  };

  const handleRemove = () => {
    if (!variantId || !productId) return;
    void deleteCartLine(variantId, productId);
  };

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
      <div className="flex gap-2.5 p-2.5">
        <div
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ${PRODUCT_IMAGE_SURFACE_CLASS}`}
        >
          <SafeImage
            src={imageSrc || undefined}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-0.5"
            fallbackClassName={PRODUCT_IMAGE_FALLBACK_CLASS}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#111827]">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{subtitle}</p>
              ) : null}
            </div>
            {variantId && productId ? (
              <button
                type="button"
                onClick={handleRemove}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition active:bg-rose-50 active:text-rose-600"
                aria-label="Savatdan olib tashlash"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}
          </div>

          {(discountLabel || (cashbackType !== 'NONE' && cashbackValue > 0)) ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {discountLabel ? (
                <span className="inline-flex rounded-full bg-rose-600 px-1.5 py-px text-[9px] font-bold text-white">
                  {discountLabel}
                </span>
              ) : null}
              {cashbackType !== 'NONE' && cashbackValue > 0 ? (
                <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} variant="compact" />
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              {item.variant && baseUnit > unitPrice ? (
                <p className="text-[10px] font-medium text-slate-400 line-through">
                  {formatMoneyUz(baseUnit)}
                </p>
              ) : null}
              <p className="text-[12px] font-medium tabular-nums text-slate-600">
                {formatMoneyUz(unitPrice)}
                <span className="ml-0.5 text-[10px] text-slate-400">/{unitLabel}</span>
              </p>
            </div>
            <p className="shrink-0 text-[15px] font-bold tabular-nums text-[#111827]">
              {formatMoneyUz(lineTotal)}
            </p>
          </div>

          {variantId && productId ? (
            <div className="mt-2.5 flex justify-end">
              <QuantitySelector
                variant="cart"
                displayLabel={quantityLabel}
                onDecrease={handleDecrease}
                onIncrease={handleIncrease}
                pending={pending}
              />
            </div>
          ) : (
            <p className="mt-2 text-right text-[11px] font-semibold text-slate-600">{quantityLabel}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function CartLineSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex gap-3">
        <div className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-xl bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-[70%] rounded bg-slate-100" />
          <div className="h-3 w-[40%] rounded bg-slate-100" />
          <div className="flex justify-end pt-1">
            <div className="h-9 w-28 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
