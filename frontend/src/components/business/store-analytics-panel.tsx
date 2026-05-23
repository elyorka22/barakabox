'use client';

import { useMemo, useState } from 'react';
import { useStoreAnalytics } from '@/hooks/use-store-analytics';
import { formatMoneyUz } from '@/lib/format';
import type { StoreAnalyticsPeriod } from '@/types/store-analytics';

const PERIODS: Array<{ id: StoreAnalyticsPeriod; label: string }> = [
  { id: 'day', label: '24 soat' },
  { id: 'week', label: '7 kun' },
  { id: 'month', label: '30 kun' },
];

function growthLabel(value: number) {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return '0%';
}

export function StoreAnalyticsPanel() {
  const [period, setPeriod] = useState<StoreAnalyticsPeriod>('week');
  const { data, loading, error, reload } = useStoreAnalytics(period);

  const maxRevenue = useMemo(() => {
    if (!data?.dailySales.length) return 1;
    return Math.max(1, ...data.dailySales.map((d) => d.revenue));
  }, [data?.dailySales]);

  if (loading && !data) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4">
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        <button type="button" className="mt-3 text-sm font-semibold text-emerald-700" onClick={() => void reload()}>
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              period === p.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data.note ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{data.note}</p>
      ) : null}

      <section className="grid grid-cols-2 gap-2">
        {[
          { label: 'Tashrif', value: kpis.visitors, growth: kpis.visitorsGrowth },
          { label: 'Ko‘rishlar', value: kpis.productViews, growth: kpis.productViewsGrowth },
          { label: 'Savatga', value: kpis.addToCart },
          { label: 'Buyurtma', value: kpis.orders, growth: kpis.ordersGrowth },
          { label: 'Daromad', value: formatMoneyUz(kpis.revenue), growth: kpis.revenueGrowth },
          { label: 'Konversiya', value: `${kpis.conversionRate}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="text-lg font-bold tabular-nums text-[#111827]">{card.value}</p>
            {'growth' in card && card.growth !== undefined ? (
              <p
                className={`text-[10px] font-medium ${
                  (card.growth ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {growthLabel(card.growth ?? 0)} oldingi davrga
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
        <h2 className="text-sm font-semibold text-[#111827]">Voronka</h2>
        <ul className="mt-2 space-y-2">
          {data.funnel.map((step) => {
            const max = Math.max(1, data.funnel[0]?.count ?? 1);
            const width = Math.max(8, Math.round((step.count / max) * 100));
            return (
              <li key={step.step}>
                <div className="mb-0.5 flex justify-between text-xs text-slate-600">
                  <span>
                    {step.step === 'visitors'
                      ? 'Tashrif'
                      : step.step === 'product_views'
                        ? 'Mahsulot ko‘rildi'
                        : step.step === 'add_to_cart'
                          ? 'Savatga'
                          : step.step === 'checkout'
                            ? 'Checkout'
                            : 'Buyurtma'}
                  </span>
                  <span className="font-semibold tabular-nums">{step.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {data.dailySales.length > 0 ? (
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
          <h2 className="text-sm font-semibold text-[#111827]">Kunlik savdo</h2>
          <div className="mt-3 flex h-24 items-end gap-1">
            {data.dailySales.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-emerald-500/90"
                  style={{ height: `${Math.max(8, (day.revenue / maxRevenue) * 72)}px` }}
                  title={formatMoneyUz(day.revenue)}
                />
                <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.topProducts.length > 0 ? (
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
          <h2 className="text-sm font-semibold text-[#111827]">Top mahsulotlar</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {data.topProducts.map((row, idx) => (
              <li key={row.productId ?? idx} className="flex items-center justify-between py-2 text-sm">
                <span className="line-clamp-1 font-medium text-[#111827]">{row.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {row.soldQuantity > 0 ? `${row.soldQuantity} sotildi` : null}
                  {row.soldQuantity > 0 && row.views > 0 ? ' · ' : null}
                  {row.views > 0 ? `${row.views} ko‘rildi` : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
