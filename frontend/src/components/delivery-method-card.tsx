'use client';

import { Zap } from 'lucide-react';
import type { DeliverySpeed } from '@/lib/delivery-pricing';

type DeliveryMethodCardProps = {
  speed: DeliverySpeed;
  selected: boolean;
  onSelect: (speed: DeliverySpeed) => void;
  title: string;
  subtitle: string;
  priceLabel: string;
  highlight?: boolean;
  disabled?: boolean;
};

export function DeliveryMethodCard({
  speed,
  selected,
  onSelect,
  title,
  subtitle,
  priceLabel,
  highlight,
  disabled,
}: DeliveryMethodCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(speed)}
      className={`flex w-full min-h-[4.5rem] items-start gap-3 rounded-[22px] border p-4 text-left transition-all duration-200 active:scale-[0.99] disabled:opacity-50 ${
        selected
          ? highlight
            ? 'border-[#16A34A] bg-gradient-to-br from-green-50 to-emerald-50/80 shadow-md shadow-green-600/10 ring-2 ring-[#16A34A]/25'
            : 'border-slate-300 bg-white shadow-md ring-2 ring-slate-200/60'
          : 'border-slate-200/90 bg-white shadow-sm hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {highlight ? (
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#16A34A] text-white shadow-inner shadow-black/10">
          <Zap className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
      ) : (
        <span className="mt-0.5 h-10 w-10 shrink-0 rounded-2xl bg-slate-100 ring-1 ring-slate-200/80" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[15px] font-bold text-[#121212]">{title}</span>
          <span className={`text-xs font-semibold ${highlight ? 'text-[#15803d]' : 'text-slate-500'}`}>{priceLabel}</span>
        </span>
        <span className="mt-0.5 block text-[13px] text-slate-600">{subtitle}</span>
      </span>
      <span
        className={`mt-1.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
          selected ? 'border-[#16A34A] bg-[#16A34A] shadow-[inset_0_0_0_3px_white]' : 'border-slate-300 bg-white'
        }`}
        aria-hidden
      />
    </button>
  );
}
