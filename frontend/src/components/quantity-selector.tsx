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
  /** card = grid pill; detail = product page; default = cart */
  variant?: 'card' | 'detail' | 'default';
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
  const isDetail = variant === 'detail';

  const minusBtn = isDetail
    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#374151] transition-transform duration-150 active:scale-90 disabled:opacity-40'
    : isCard
      ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-[#374151] transition-transform duration-150 active:scale-90 disabled:opacity-40'
      : size === 'lg'
        ? 'flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40'
        : size === 'sm'
          ? 'flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80 transition active:scale-90 disabled:opacity-40'
          : 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800 transition active:scale-95 disabled:opacity-40';

  const plusBtn = isDetail
    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)] transition-transform duration-150 active:scale-90 disabled:opacity-40'
    : isCard
      ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white transition-transform duration-150 active:scale-90 disabled:opacity-40'
      : `${minusBtn} bg-[#16A34A] text-white shadow-sm shadow-green-600/20 ring-0`;

  const icon = isDetail ? 'h-5 w-5' : isCard ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const countClass = isDetail
    ? 'product-card-qty-label min-w-[5rem] flex-1 truncate px-2 text-center text-[15px] font-semibold tabular-nums text-[#111827]'
    : isCard
      ? 'product-card-qty-label min-w-[2.75rem] max-w-[4.5rem] flex-1 truncate px-0.5 text-center text-[11px] font-semibold leading-tight tabular-nums text-[#111827]'
      : size === 'sm'
        ? 'min-w-[3.25rem] max-w-[5.5rem] truncate px-0.5 text-center text-[11px] font-bold tabular-nums text-[#121212]'
        : 'min-w-[4rem] max-w-[6.5rem] truncate px-1 text-center text-sm font-bold tabular-nums text-[#121212]';

  const wrapClass = isDetail
    ? 'mx-auto flex w-full max-w-[280px] items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]'
    : isCard
      ? 'inline-flex min-h-[32px] max-w-[9rem] items-center gap-0 rounded-full bg-white px-0.5 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.1)]'
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
