'use client';

import { formatMoneyUz } from '@/lib/format';

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

/** Progress line for free standard delivery (not express). */
export function FreeDeliveryProgressLine(props: {
  subtotal: number;
  threshold: number;
  speed: 'STANDARD' | 'EXPRESS';
}) {
  const { subtotal, threshold, speed } = props;
  if (speed === 'EXPRESS') {
    return (
      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-snug text-slate-600">
        Tezkor yetkazish — bepul yetkazish chegirmasi qo&apos;llanmaydi.
      </p>
    );
  }
  if (subtotal <= 0) return null;
  const left = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  if (left === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-emerald-800">Bepul yetkazish shartlari bajarildi</p>
        <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full w-full rounded-full bg-[#16A34A] transition-all duration-300" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-snug text-slate-600">
        <span className="font-semibold text-[#121212]">{formatMoneyUz(left)}</span> yetishmaydi bepul yetkazish uchun
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
