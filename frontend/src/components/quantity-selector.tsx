'use client';

import { Minus, Plus } from 'lucide-react';

type QuantitySelectorProps = {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  pending?: boolean;
  /** `sm` compact cart rows; `md` default; `lg` large. */
  size?: 'sm' | 'md' | 'lg';
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
      : size === 'sm'
        ? 'flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40'
        : 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40';
  const icon = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const countClass =
    size === 'sm' ? 'min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-[#121212]' : 'min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-[#121212]';
  const wrapPad = size === 'sm' ? 'p-0.5 gap-0.5' : 'p-1 gap-1';

  return (
    <div
      className={`inline-flex items-center rounded-full bg-white/95 shadow-[0_1px_8px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/75 ${wrapPad} ${className}`.trim()}
    >
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
      <span className={countClass}>{value}</span>
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
