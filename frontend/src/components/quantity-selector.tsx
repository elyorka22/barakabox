'use client';

import { Minus, Plus } from 'lucide-react';

type QuantitySelectorProps = {
  displayLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  pending?: boolean;
  /** @deprecated prefer variant */
  size?: 'sm' | 'md' | 'lg';
  /** card = white pill on product grid; default = cart / legacy */
  variant?: 'card' | 'default';
  className?: string;
};

export function QuantitySelector({
  displayLabel,
  onDecrease,
  onIncrease,
  disabled,
  pending,
  size = 'md',
  variant = 'default',
  className = '',
}: QuantitySelectorProps) {
  const isCard = variant === 'card';

  const minusBtn = isCard
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#374151] transition-transform duration-150 active:scale-90 disabled:opacity-40'
    : size === 'lg'
      ? 'flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40'
      : size === 'sm'
        ? 'flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80 transition active:scale-90 disabled:opacity-40'
        : 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40';

  const plusBtn = isCard
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-transform duration-150 active:scale-90 disabled:opacity-40'
    : `${minusBtn} bg-[#16A34A] text-white shadow-sm shadow-green-600/20 ring-0`;

  const icon = isCard ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const countClass = isCard
    ? 'product-card-qty-label min-w-[3.5rem] max-w-[5.75rem] flex-1 truncate px-1 text-center text-[12px] font-bold leading-tight tabular-nums text-[#111827]'
    : size === 'sm'
      ? 'min-w-[3.25rem] max-w-[5.5rem] truncate px-0.5 text-center text-[11px] font-bold tabular-nums text-[#121212]'
      : 'min-w-[4rem] max-w-[6.5rem] truncate px-1 text-center text-sm font-bold tabular-nums text-[#121212]';

  const wrapClass = isCard
    ? 'inline-flex min-h-[40px] min-w-[7.75rem] max-w-[10.5rem] items-center gap-0.5 rounded-full bg-white px-1 py-0.5 shadow-[0_4px_18px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04]'
    : `inline-flex items-center rounded-full bg-white/95 shadow-[0_2px_12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 ${size === 'sm' ? 'gap-0.5 p-0.5' : 'gap-1 p-1'}`;

  return (
    <div className={`${wrapClass} ${className}`.trim()}>
      <button
        type="button"
        className={minusBtn}
        onClick={onDecrease}
        disabled={disabled || pending}
        aria-label="Miqdorni kamaytirish"
        aria-busy={pending}
      >
        <Minus className={icon} strokeWidth={2.4} />
      </button>
      <span key={displayLabel} className={countClass}>
        {displayLabel}
      </span>
      <button
        type="button"
        className={plusBtn}
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
