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

/** Softer grocery green — not neon marketplace accent. */
const ADD_GREEN = 'bg-[#3d9e72]';
const ADD_GREEN_SHADOW = 'shadow-[0_2px_8px_rgba(61,158,114,0.28)]';

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
      className="product-card-qty-enter inline-flex h-[26px] max-w-[96px] items-center rounded-full bg-white/92 py-px pl-px pr-px shadow-[0_2px_8px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.04]"
      role="group"
      aria-label="Miqdor"
    >
      <button
        type="button"
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-[#4b5563] transition-transform duration-100 active:scale-[0.9] disabled:opacity-40"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Miqdorni kamaytirish"
      >
        <Minus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
      <span
        key={displayLabel}
        className="qty-selector-value min-w-[1.25rem] max-w-[2rem] truncate px-0.5 text-center text-[10px] font-semibold leading-none tabular-nums text-[#111827]"
      >
        {displayLabel}
      </span>
      <button
        type="button"
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white ${ADD_GREEN} ${ADD_GREEN_SHADOW} transition-transform duration-100 active:scale-[0.9] disabled:opacity-40`}
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Miqdorni oshirish"
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
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
        className={`product-card-add-btn flex h-7 w-7 items-center justify-center rounded-full text-white ${ADD_GREEN} ${ADD_GREEN_SHADOW} transition-transform duration-100 active:scale-[0.9] disabled:opacity-45`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
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
