'use client';

import { Gift, Percent } from 'lucide-react';
import { getCashbackPromoLabel } from '@/lib/cashback';

type CashbackBadgeProps = {
  cashbackType?: string | null;
  cashbackValue?: number | null;
  /** Extra Tailwind classes (e.g. positioning). */
  className?: string;
};

const pillBase =
  'inline-flex max-w-full items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-extrabold leading-none tracking-tight text-white shadow-md ring-1 ring-white/30';

export function CashbackBadge({ cashbackType, cashbackValue, className = '' }: CashbackBadgeProps) {
  const promo = getCashbackPromoLabel(cashbackType ?? 'NONE', Number(cashbackValue ?? 0));
  if (!promo) return null;

  if (promo.kind === 'percent') {
    return (
      <span
        className={`${pillBase} bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 shadow-[0_3px_10px_rgba(234,88,12,0.42)] ${className}`.trim()}
        title={promo.label}
      >
        <Percent className="h-2.5 w-2.5 shrink-0 drop-shadow-sm" strokeWidth={2.8} aria-hidden />
        <span className="min-w-0 truncate drop-shadow-sm">{promo.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`${pillBase} bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-700 shadow-[0_3px_10px_rgba(20,184,166,0.4)] ${className}`.trim()}
      title={promo.label}
    >
      <Gift className="h-2.5 w-2.5 shrink-0 drop-shadow-sm" strokeWidth={2.3} aria-hidden />
      <span className="min-w-0 truncate drop-shadow-sm">{promo.label}</span>
    </span>
  );
}
