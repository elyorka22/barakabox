'use client';

import { useMemo, useState } from 'react';
import { useBusinessDashboard } from '@/hooks/use-business-dashboard';
import { BusinessStatsGrid } from '@/components/business/business-stats-grid';
import { BusinessBottomNav, type BusinessTab } from '@/components/business/business-bottom-nav';
import { BusinessOrdersPanel } from '@/components/business/business-orders-panel';
import { BusinessProductsPanel } from '@/components/business/business-products-panel';
import { BusinessInventoryPanel } from '@/components/business/business-inventory-panel';
import { formatMoneyUz } from '@/lib/format';

export function BusinessDashboard() {
  const { data, loading, error, reload } = useBusinessDashboard();
  const [tab, setTab] = useState<BusinessTab>('home');

  const maxDailyRevenue = useMemo(() => {
    if (!data?.dailySales.length) return 1;
    return Math.max(1, ...data.dailySales.map((d) => d.revenue));
  }, [data?.dailySales]);

  if (loading && !data) {
    return (
      <div className="space-y-3 p-4 pb-24">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 pb-24">
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-emerald-700"
          onClick={() => void reload()}
        >
          Qayta yuklash
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="pb-24">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Doʻkon</p>
        <h1 className="text-lg font-bold text-[#111827]">{data.business.displayName}</h1>
        {data.business.login ? (
          <p className="text-xs text-slate-500">Login: {data.business.login}</p>
        ) : null}
      </div>

      {tab === 'home' ? (
        <div className="space-y-4 p-4">
          <BusinessStatsGrid kpis={data.kpis} />

          <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
            <h2 className="text-sm font-semibold text-[#111827]">7 kunlik savdo</h2>
            <div className="mt-3 flex h-24 items-end gap-1">
              {data.dailySales.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-emerald-500/90"
                    style={{ height: `${Math.max(8, (day.revenue / maxDailyRevenue) * 72)}px` }}
                    title={formatMoneyUz(day.revenue)}
                  />
                  <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>

          {data.topProducts.length > 0 ? (
            <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
              <h2 className="text-sm font-semibold">Eng koʻp sotilgan</h2>
              <ul className="mt-2 space-y-2">
                {data.topProducts.map((p) => (
                  <li key={p.productId ?? p.name} className="flex justify-between text-sm">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {p.soldQuantity} {p.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <BusinessInventoryPanel inventory={data.inventory} />
        </div>
      ) : null}

      {tab === 'orders' ? <BusinessOrdersPanel orders={data.recentOrders} onRefresh={reload} /> : null}
      {tab === 'products' ? <BusinessProductsPanel onRefresh={reload} /> : null}

      <BusinessBottomNav tab={tab} onTabChange={setTab} pendingCount={data.kpis.pendingOrders} />
    </div>
  );
}
