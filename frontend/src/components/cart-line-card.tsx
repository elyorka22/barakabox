'use client';

import { Trash2 } from 'lucide-react';
import { CashbackBadge } from '@/components/cashback-badge';
import { QuantitySelector } from '@/components/quantity-selector';
import { formatMoneyUz } from '@/lib/format';
import type { CartItem } from '@/lib/cart-store';
import { adjustCart, deleteCartLine } from '@/lib/cart-store';
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
  const img = item.variant?.imageUrl ?? null;

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
    <article className="overflow-hidden rounded-[18px] bg-white shadow-[0_2px_14px_rgba(15,23,42,0.05)] ring-1 ring-slate-100/90 transition-shadow duration-200 active:shadow-[0_4px_18px_rgba(15,23,42,0.07)]">
      <div className="flex gap-2.5 p-2.5">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100 sm:h-[5.25rem] sm:w-[5.25rem]">
          {img ? (
            <img src={img} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">Rasm</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-[#121212]">{title}</h3>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-500">{subtitle}</p>
              ) : null}
              <p className="mt-1 text-[11px] font-semibold text-emerald-800">{quantityLabel}</p>
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
            <div className="mt-1 flex flex-row flex-wrap items-center gap-1">
              {discountLabel ? (
                <span className="inline-flex rounded-full bg-gradient-to-br from-rose-600 to-rose-700 px-1.5 py-px text-[9px] font-bold leading-tight text-white">
                  {discountLabel}
                </span>
              ) : null}
              {cashbackType !== 'NONE' && cashbackValue > 0 ? (
                <CashbackBadge cashbackType={cashbackType} cashbackValue={cashbackValue} variant="compact" />
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              {item.variant && baseUnit > unitPrice ? (
                <p className="text-[10px] font-medium leading-none text-slate-400 line-through">{formatMoneyUz(baseUnit)}</p>
              ) : null}
              <p className="text-[11px] font-semibold tabular-nums leading-tight text-slate-700">
                {formatMoneyUz(unitPrice)}
                <span className="ml-0.5 text-[9px] font-medium text-slate-500">/{unitLabel}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {variantId && productId ? (
                <QuantitySelector
                  displayLabel={quantityLabel}
                  onDecrease={handleDecrease}
                  onIncrease={handleIncrease}
                  pending={pending}
                  size="sm"
                />
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {quantityLabel}
                </span>
              )}
              <p className="text-[13px] font-bold tabular-nums text-[#121212]">{formatMoneyUz(lineTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CartLineSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[18px] bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
      <div className="flex gap-2.5">
        <div className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-[70%] rounded bg-slate-100" />
          <div className="h-3 w-[40%] rounded bg-slate-100" />
          <div className="flex justify-between gap-2 pt-1">
            <div className="h-6 w-16 rounded bg-slate-100" />
            <div className="h-7 w-24 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
