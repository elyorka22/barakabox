'use client';

import { Minus, Plus } from 'lucide-react';

type QuantitySelectorProps = {
  displayLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  pending?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function QuantitySelector({
  displayLabel,
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
        ? 'flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80 transition active:scale-90 disabled:opacity-40'
        : 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40';
  const icon = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const countClass =
    size === 'sm'
      ? 'min-w-[3.25rem] max-w-[5.5rem] truncate px-0.5 text-center text-[11px] font-bold tabular-nums text-[#121212]'
      : 'min-w-[4rem] max-w-[6.5rem] truncate px-1 text-center text-sm font-bold tabular-nums text-[#121212]';
  const wrapPad = size === 'sm' ? 'gap-0.5 p-0.5' : 'gap-1 p-1';

  return (
    <div
      className={`inline-flex items-center rounded-full bg-white/95 shadow-[0_2px_12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 ${wrapPad} ${className}`.trim()}
    >
      <button
        type="button"
        className={btn}
        onClick={onDecrease}
        disabled={disabled || pending}
        aria-label="Miqdorni kamaytirish"
        aria-busy={pending}
      >
        <Minus className={icon} strokeWidth={2.4} />
      </button>
      <span key={displayLabel} className={`${countClass} transition-all duration-200`}>
        {displayLabel}
      </span>
      <button
        type="button"
        className={`${btn} bg-[#16A34A] text-white shadow-sm shadow-green-600/20 ring-0`}
        onClick={onIncrease}
        disabled={disabled || pending}
        aria-label="Miqdorni oshirish"
        aria-busy={pending}
      >
        <Plus className={icon} strokeWidth={2.4} />
      </button>
    </div>
  );
}
