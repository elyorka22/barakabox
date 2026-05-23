'use client';

import type { StorePanelDashboard } from '@/types/store-panel';

type Props = {
  marketplace: NonNullable<StorePanelDashboard['marketplace']>;
};

export function StorePanelStats({ marketplace }: Props) {
  const { kpis } = marketplace;
  const cards = [
    { label: 'Listinglar', value: kpis.totalListings },
    { label: 'Vitrinada', value: kpis.visibleListings },
    { label: 'Kam qolgan', value: kpis.lowStockCount },
    { label: 'Top', value: kpis.topCount },
  ];

  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
      <h2 className="text-sm font-semibold text-[#111827]">Marketplace</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="text-lg font-bold tabular-nums text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
