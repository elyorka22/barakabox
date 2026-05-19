'use client';

import { formatMoneyUz } from '@/lib/format';
import type { BusinessDashboard } from '@/types/business-dashboard';

type Props = {
  kpis: BusinessDashboard['kpis'];
};

const cards: Array<{
  key: keyof BusinessDashboard['kpis'];
  label: string;
  format?: 'money' | 'percent';
}> = [
  { key: 'todayOrders', label: 'Bugungi buyurtmalar' },
  { key: 'todayRevenue', label: 'Bugungi tushum', format: 'money' },
  { key: 'pendingOrders', label: 'Kutilayotgan' },
  { key: 'activeProducts', label: 'Faol mahsulotlar' },
  { key: 'averageOrderValue', label: 'Oʻrtacha chek', format: 'money' },
  { key: 'repeatCustomers', label: 'Qayta mijozlar' },
];

export function BusinessStatsGrid({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cards.map((card) => {
        const raw = kpis[card.key];
        const value =
          card.format === 'money'
            ? formatMoneyUz(Number(raw))
            : card.format === 'percent'
              ? `${raw}%`
              : String(raw);
        return (
          <div
            key={card.key}
            className="rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 text-[18px] font-bold tabular-nums leading-tight text-[#111827]">
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
