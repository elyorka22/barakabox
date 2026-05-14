'use client';

import { getCashbackCartBadgeLabel, getCashbackPromoLabel } from '@/lib/cashback';

type CashbackBadgeProps = {
  cashbackType?: string | null;
  cashbackValue?: number | null;
  /** `promo` = product cards ("5% keshbek"); `compact` = cart lines ("5%" / "+500 so'm"). */
  variant?: 'promo' | 'compact';
  /** Extra Tailwind classes (e.g. positioning). */
  className?: string;
};

/** Lighter promo pill than discount; single-line text, ellipsis on narrow cards. */
export function CashbackBadge({
  cashbackType,
  cashbackValue,
  variant = 'promo',
  className = '',
}: CashbackBadgeProps) {
  const promo =
    variant === 'compact'
      ? getCashbackCartBadgeLabel(cashbackType ?? 'NONE', Number(cashbackValue ?? 0))
      : getCashbackPromoLabel(cashbackType ?? 'NONE', Number(cashbackValue ?? 0));
  if (!promo) return null;

  const tone =
    promo.kind === 'percent'
      ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 ring-amber-200/90 shadow-sm shadow-amber-900/5'
      : 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 ring-teal-200/90 shadow-sm shadow-teal-900/5';

  const size = variant === 'compact' ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';

  return (
    <span
      className={`inline-block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full font-semibold leading-none ring-1 ${size} ${tone} ${className}`.trim()}
      title={promo.label}
    >
      {promo.label}
    </span>
  );
}
