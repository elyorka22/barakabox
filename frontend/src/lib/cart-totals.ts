import type { CartItem } from '@/lib/cart-store';
import { estimateLineCashbackTiyin } from '@/lib/cashback';
import {
  calculateSellingModeLineTotal,
  resolveSellingMode,
} from '@onlinebozor/product-units';

export function cartLineUnitPrice(item: CartItem): number {
  if (item.variant) return Math.round(Number(item.variant.discountPrice ?? item.variant.price));
  if (item.product) return Math.round(Number(item.product.price));
  if (item.box) return Math.round(Number(item.box.price));
  return 0;
}

export function cartLineBaseUnitPrice(item: CartItem): number {
  if (item.variant) return Math.round(Number(item.variant.price));
  if (item.product) return Math.round(Number(item.product.price));
  if (item.box) return Math.round(Number(item.box.price));
  return 0;
}

export function cartLineTotal(item: CartItem, quantity = item.quantity): number {
  if (item.box) {
    return calculateSellingModeLineTotal(cartLineUnitPrice(item), quantity, 'piece');
  }
  const mode = resolveSellingMode(item.variant?.product ?? item.product ?? undefined);
  return calculateSellingModeLineTotal(cartLineUnitPrice(item), quantity, mode);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartLineTotal(item), 0);
}

export function cartCashbackEarnEstimate(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (item.variant?.product) {
      const line = cartLineTotal(item);
      return (
        sum +
        estimateLineCashbackTiyin(
          line,
          item.variant.product.cashbackType ?? 'NONE',
          Number(item.variant.product.cashbackValue ?? 0),
        )
      );
    }
    if (item.product) {
      const line = cartLineTotal(item);
      return (
        sum +
        estimateLineCashbackTiyin(
          line,
          item.product.cashbackType ?? 'NONE',
          Number(item.product.cashbackValue ?? 0),
        )
      );
    }
    return sum;
  }, 0);
}

/** Distinct cart lines that have a cashback offer (for “N ta mahsulot”). */
export function countCashbackOfferLines(items: CartItem[]): number {
  let n = 0;
  for (const item of items) {
    const p = item.variant?.product ?? item.product;
    if (!p) continue;
    const t = p.cashbackType ?? 'NONE';
    if (t !== 'NONE' && Number(p.cashbackValue ?? 0) > 0) n += 1;
  }
  return n;
}
