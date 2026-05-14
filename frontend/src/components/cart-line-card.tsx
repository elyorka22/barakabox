'use client';

import { Trash2 } from 'lucide-react';
import { CashbackBadge } from '@/components/cashback-badge';
import { QuantitySelector } from '@/components/quantity-selector';
import { formatMoneyUz } from '@/lib/format';
import type { CartItem } from '@/lib/cart-store';
import { deleteCartLine, incrementCart } from '@/lib/cart-store';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL_UZ,
  normalizedProductSaleUnit,
} from '@onlinebozor/product-units';
import { useCartPending, useCartQuantity } from '@/lib/use-cart-store';
import { cartLineBaseUnitPrice, cartLineUnitPrice } from '@/lib/cart-totals';

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
  const unit =
    normalizedProductSaleUnit(item.variant?.product ?? item.product ?? undefined) ?? DEFAULT_PRODUCT_UNIT;
  const unitLabel = PRODUCT_UNIT_LABEL_UZ[unit];
  const lineTotal = unitPrice * displayedQuantity;
  const productForCashback = item.variant?.product ?? item.product;
  const cashbackType = productForCashback?.cashbackType ?? 'NONE';
  const cashbackValue = Number(productForCashback?.cashbackValue ?? 0);
  const discountLabel = item.variant ? discountPercentLabel(baseUnit, unitPrice) : null;
  const img = item.variant?.imageUrl ?? null;

  const handleDecrease = () => {
    if (!variantId || !productId) return;
    if (displayedQuantity <= 1) {
      void deleteCartLine(variantId, productId);
      return;
    }
    incrementCart(variantId, productId, -1);
  };

  const handleIncrease = () => {
    if (!variantId || !productId) return;
    incrementCart(variantId, productId, 1);
  };

  const handleRemove = () => {
    if (!variantId || !productId) return;
    void deleteCartLine(variantId, productId);
  };

  return (
    <article className="overflow-hidden rounded-[22px] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
      <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
        <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100 sm:h-24 sm:w-24">
          {img ? (
            <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">Rasm yo&apos;q</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-[#121212]">{title}</h3>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-1 text-[12px] font-medium text-slate-500">{subtitle}</p>
              ) : null}
            </div>
            {variantId && productId ? (
              <button
                type="button"
                onClick={handleRemove}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition active:scale-95 active:bg-rose-50 active:text-rose-600"
                aria-label="Savatdan olib tashlash"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : null}
          </div>
          <div className="mt-2 flex flex-col items-start gap-1">
            {discountLabel ? (
              <span className="inline-flex rounded-full bg-gradient-to-br from-rose-600 to-rose-700 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                {discountLabel}
              </span>
            ) : null}
            {cashbackType !== 'NONE' && cashbackValue > 0 ? (
              <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} variant="compact" />
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              {item.variant && baseUnit > unitPrice ? (
                <p className="text-[11px] font-medium text-slate-400 line-through">{formatMoneyUz(baseUnit)}</p>
              ) : null}
              <p className="text-[13px] font-semibold tabular-nums text-slate-700">
                {formatMoneyUz(unitPrice)}
                <span className="ml-1 text-[11px] font-medium text-slate-500">/ {unitLabel}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {variantId && productId ? (
                <QuantitySelector
                  value={displayedQuantity}
                  onDecrease={handleDecrease}
                  onIncrease={handleIncrease}
                  pending={pending}
                  size="lg"
                />
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {displayedQuantity}×
                </span>
              )}
              <p className="text-[15px] font-bold tabular-nums text-[#121212]">{formatMoneyUz(lineTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CartLineSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-[72%] max-w-[12rem] rounded bg-slate-100" />
          <div className="h-3 w-[48%] max-w-[8rem] rounded bg-slate-100" />
          <div className="h-8 w-32 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
