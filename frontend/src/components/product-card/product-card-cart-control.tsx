'use client';

import { memo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { QuantitySelector } from '@/components/quantity-selector';
import { adjustCart } from '@/lib/cart-store';
import { hapticTap } from '@/lib/haptic';
import { useCartQuantity } from '@/lib/use-cart-store';
import {
  DEFAULT_PRODUCT_UNIT,
  formatSellingModeQuantity,
  type ProductUnitCode,
  type SellingMode,
} from '@onlinebozor/product-units';

type Props = {
  variantId: string;
  productId: string;
  sellingMode: SellingMode;
  unit?: ProductUnitCode;
  disabled?: boolean;
};

function stopLinkNavigation(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function ProductCardCartControlBase({ variantId, productId, sellingMode, unit, disabled }: Props) {
  const quantity = useCartQuantity(variantId);
  const displayLabel = formatSellingModeQuantity(quantity, sellingMode, unit ?? DEFAULT_PRODUCT_UNIT);
  const inCart = quantity > 0;

  const runAdjust = useCallback(
    (action: 'add' | 'increase' | 'decrease') => {
      if (disabled) return;
      hapticTap();
      adjustCart(variantId, productId, sellingMode, action);
    },
    [disabled, variantId, productId, sellingMode],
  );

  if (!inCart) {
    return (
      <button
        type="button"
        onClick={(event) => {
          stopLinkNavigation(event);
          runAdjust('add');
        }}
        disabled={disabled}
        aria-label={disabled ? 'Mahsulot tugagan' : "Savatga qo'shish"}
        className="product-card-add-btn flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_4px_14px_rgba(34,197,94,0.38)] transition-transform duration-100 hover:scale-[1.04] active:scale-[0.88] disabled:opacity-45"
      >
        <Plus className="h-5 w-5" strokeWidth={2.75} />
      </button>
    );
  }

  return (
    <div onClick={stopLinkNavigation} onKeyDown={stopLinkNavigation} className="product-card-qty-enter">
      <QuantitySelector
        displayLabel={displayLabel}
        variant="overlay"
        blockWhilePending={false}
        disabled={disabled}
        onDecrease={() => runAdjust('decrease')}
        onIncrease={() => runAdjust('increase')}
      />
    </div>
  );
}

export const ProductCardCartControl = memo(ProductCardCartControlBase);
