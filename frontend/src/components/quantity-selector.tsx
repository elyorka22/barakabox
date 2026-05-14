'use client';

import { Minus, Plus } from 'lucide-react';

type QuantitySelectorProps = {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  pending?: boolean;
  /** Larger touch targets for cart */
  size?: 'md' | 'lg';
  className?: string;
};

export function QuantitySelector({
  value,
  onDecrease,
  onIncrease,
  disabled,
  pending,
  size = 'md',
  className = '',
}: QuantitySelectorProps) {
  const btn =
    size === 'lg'
      ? 'flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40'
      : 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40';
  const icon = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className={`inline-flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-[0_2px_10px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 ${className}`.trim()}>
      <button
        type="button"
        className={btn}
        onClick={onDecrease}
        disabled={disabled || pending}
        aria-label="Sonni kamaytirish"
        aria-busy={pending}
      >
        <Minus className={icon} strokeWidth={2.4} />
      </button>
      <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-[#121212]">{value}</span>
      <button
        type="button"
        className={`${btn} bg-[#16A34A] text-white shadow-sm shadow-green-600/25`}
        onClick={onIncrease}
        disabled={disabled || pending}
        aria-label="Sonni oshirish"
        aria-busy={pending}
      >
        <Plus className={icon} strokeWidth={2.4} />
      </button>
    </div>
  );
}
