'use client';

import { Minus, Plus } from 'lucide-react';

export type QuantitySelectorVariant = 'card' | 'detail' | 'cart';

type QuantitySelectorProps = {
  displayLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: QuantitySelectorVariant;
  className?: string;
};

const SIZES = {
  card: { btn: 'h-7 w-7', icon: 'h-3.5 w-3.5', label: 'text-[11px] min-w-[2.5rem] max-w-[4.25rem]' },
  cart: { btn: 'h-9 w-9', icon: 'h-4 w-4', label: 'text-[12px] min-w-[3rem] max-w-[5.5rem]' },
  detail: { btn: 'h-12 w-12', icon: 'h-5 w-5', label: 'text-[15px] min-w-[5rem] max-w-[7rem]' },
} as const;

const BTN_BASE =
  'flex shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-90 disabled:opacity-40';
const MINUS = `${BTN_BASE} bg-[#f3f4f6] text-[#374151]`;
const PLUS = `${BTN_BASE} bg-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.32)]`;

export function QuantitySelector({
  displayLabel,
  onDecrease,
  onIncrease,
  disabled,
  pending,
  variant = 'cart',
  className = '',
}: QuantitySelectorProps) {
  const size = SIZES[variant];
  const wrapClass =
    variant === 'detail'
      ? 'mx-auto flex w-full max-w-[300px] items-center gap-1.5 rounded-full bg-white px-1.5 py-1 shadow-[0_2px_14px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05]'
      : variant === 'card'
        ? 'inline-flex max-w-full items-center gap-0.5 rounded-full bg-white px-0.5 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.04]'
        : 'inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-0.5 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05]';

  return (
    <div className={`${wrapClass} ${className}`.trim()} role="group" aria-label="Miqdor">
      <button
        type="button"
        className={`${MINUS} ${size.btn}`}
        onClick={onDecrease}
        disabled={disabled || pending}
        aria-label="Miqdorni kamaytirish"
        aria-busy={pending}
      >
        <Minus className={size.icon} strokeWidth={2.5} aria-hidden />
      </button>
      <span
        key={displayLabel}
        className={`flex-1 truncate px-0.5 text-center font-semibold tabular-nums leading-tight text-[#111827] ${size.label}`}
      >
        {displayLabel}
      </span>
      <button
        type="button"
        className={`${PLUS} ${size.btn}`}
        onClick={onIncrease}
        disabled={disabled || pending}
        aria-label="Miqdorni oshirish"
        aria-busy={pending}
      >
        <Plus className={size.icon} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}