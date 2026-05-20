'use client';

import { formatMoneyUz } from '@/lib/format';
import type { DeliveryConfig, DeliveryQuote } from '@/lib/delivery-pricing';

export type CartSummaryRow = {
  key: string;
  label: string;
  value: string;
  variant?: 'default' | 'muted' | 'accent' | 'discount' | 'total';
};

type CartSummaryProps = {
  rows: CartSummaryRow[];
  className?: string;
};

export function CartSummary({ rows, className = '' }: CartSummaryProps) {
  return (
    <div className={`space-y-2.5 text-[14px] ${className}`.trim()}>
      {rows.map((row) => {
        const isTotal = row.variant === 'total';
        const isAccent = row.variant === 'accent';
        const isDiscount = row.variant === 'discount';
        const isMuted = row.variant === 'muted';
        return (
          <div
            key={row.key}
            className={`flex items-center justify-between gap-3 ${
              isTotal ? 'border-t border-slate-100 pt-3 text-[17px] font-bold text-[#121212]' : ''
            }`}
          >
            <span
              className={
                isMuted
                  ? 'text-slate-500'
                  : isAccent || isDiscount
                    ? 'font-medium text-emerald-800'
                    : 'text-slate-600'
              }
            >
              {row.label}
            </span>
            <span
              className={`shrink-0 tabular-nums transition-all duration-300 ${
                isTotal
                  ? 'text-[#121212]'
                  : isDiscount
                    ? 'font-semibold text-emerald-700'
                    : isAccent
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-[#121212]'
              }`}
            >
              {row.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Free-delivery progress / success message for cart and checkout. */
export function DeliveryFreeMessage(props: {
  quote: DeliveryQuote | null;
  config: DeliveryConfig | null;
}) {
  const { quote, config } = props;
  if (!quote || !config || quote.subtotalAmount <= 0 || !config.freeDeliveryEnabled) {
    return null;
  }

  if (quote.isFreeDelivery) {
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium leading-snug text-emerald-800">
        Tabriklaymiz! Sizda bepul yetkazib berish mavjud
      </p>
    );
  }

  const pct = Math.min(100, Math.round((quote.subtotalAmount / config.freeDeliveryThreshold) * 100));

  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-snug text-slate-600">
        Yana{' '}
        <span className="font-semibold text-[#121212]">
          {formatMoneyUz(quote.remainingForFreeDelivery)}
        </span>{' '}
        lik xarid qilsangiz yetkazib berish bepul bo&apos;ladi
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#16A34A] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
