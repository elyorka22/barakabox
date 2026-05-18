'use client';

import { memo } from 'react';
import { Plus } from 'lucide-react';
import { QuantitySelector } from '@/components/quantity-selector';
import { adjustCart } from '@/lib/cart-store';
import { useCartPending, useCartQuantity } from '@/lib/use-cart-store';
import {
  formatCartQuantityDisplay,
  type ProductUnitCode,
} from '@onlinebozor/product-units';

type Props = {
  variantId: string;
  productId: string;
  unit: ProductUnitCode;
  disabled?: boolean;
};

function stopLinkNavigation(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function ProductCardCartControlBase({ variantId, productId, unit, disabled }: Props) {
  const quantity = useCartQuantity(variantId);
  const pending = useCartPending(variantId);
  const displayLabel = formatCartQuantityDisplay(quantity, unit);

  if (quantity <= 0) {
    return (
      <button
        type="button"
        onClick={(event) => {
          stopLinkNavigation(event);
          if (disabled) return;
          adjustCart(variantId, productId, unit, 'add');
        }}
        disabled={disabled}
        aria-label={disabled ? 'Mahsulot tugagan' : "Savatga qo'shish"}
        aria-busy={pending}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-[0_4px_14px_rgba(22,163,74,0.4)] transition-transform duration-200 active:scale-90 disabled:opacity-50"
      >
        <Plus className="h-[18px] w-[18px]" strokeWidth={2.6} />
      </button>
    );
  }

  return (
    <div onClick={stopLinkNavigation} className="transition-opacity duration-200">
      <QuantitySelector
        displayLabel={displayLabel}
        size="sm"
        pending={pending}
        disabled={disabled}
        onDecrease={() => adjustCart(variantId, productId, unit, 'decrease')}
        onIncrease={() => adjustCart(variantId, productId, unit, 'increase')}
      />
    </div>
  );
}

export const ProductCardCartControl = memo(ProductCardCartControlBase);
