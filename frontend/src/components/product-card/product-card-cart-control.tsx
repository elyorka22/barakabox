'use client';

import { memo, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
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

type StepperProps = {
  displayLabel: string;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

function CompactCardStepper({ displayLabel, disabled, onDecrease, onIncrease }: StepperProps) {
  return (
    <div
      className="product-card-qty-enter inline-flex h-7 max-w-[104px] items-center rounded-full bg-white/95 py-0.5 pl-0.5 pr-0.5 shadow-[0_2px_8px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.05]"
      role="group"
      aria-label="Miqdor"
    >
      <button
        type="button"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[#374151] transition-transform duration-100 active:scale-[0.88] disabled:opacity-40"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Miqdorni kamaytirish"
      >
        <Minus className="h-3 w-3" strokeWidth={2.75} aria-hidden />
      </button>
      <span
        key={displayLabel}
        className="qty-selector-value min-w-[1.35rem] max-w-[2.1rem] truncate px-0.5 text-center text-[10px] font-semibold leading-none tabular-nums text-[#111827]"
      >
        {displayLabel}
      </span>
      <button
        type="button"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_2px_6px_rgba(34,197,94,0.32)] transition-transform duration-100 active:scale-[0.88] disabled:opacity-40"
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Miqdorni oshirish"
      >
        <Plus className="h-3 w-3" strokeWidth={2.75} aria-hidden />
      </button>
    </div>
  );
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
        className="product-card-add-btn flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_3px_10px_rgba(34,197,94,0.35)] transition-transform duration-100 active:scale-[0.88] disabled:opacity-45"
      >
        <Plus className="h-4 w-4" strokeWidth={2.75} />
      </button>
    );
  }

  return (
    <div onClick={stopLinkNavigation} onKeyDown={stopLinkNavigation}>
      <CompactCardStepper
        displayLabel={displayLabel}
        disabled={disabled}
        onDecrease={() => runAdjust('decrease')}
        onIncrease={() => runAdjust('increase')}
      />
    </div>
  );
}

export const ProductCardCartControl = memo(ProductCardCartControlBase);
