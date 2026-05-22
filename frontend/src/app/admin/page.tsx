'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import type { AdminDashboard, DashboardPeriod } from '@/types/admin-dashboard';
import { DashboardKpiGrid } from '@/components/admin/dashboard/dashboard-kpi-grid';
import { DashboardSection } from '@/components/admin/dashboard/dashboard-ui';
import {
  DashboardTopProducts,
  DashboardInventoryAlerts,
  DashboardDistricts,
  DashboardCouriers,
  DashboardCategories,
  DashboardCustomers,
} from '@/components/admin/dashboard/dashboard-tables';
import { DashboardActivityFeed } from '@/components/admin/dashboard/dashboard-activity';
import { DashboardQuickActions } from '@/components/admin/dashboard/dashboard-quick-actions';
import { DashboardScheduledSection } from '@/components/admin/dashboard/dashboard-scheduled-section';

const DashboardAnalyticsCharts = dynamic(
  () =>
    import('@/components/admin/dashboard/dashboard-analytics-charts').then(
      (m) => m.DashboardAnalyticsCharts,
    ),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-slate-100" /> },
);

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'Kun' },
  { id: 'week', label: 'Hafta' },
  { id: 'month', label: 'Oy' },
  { id: 'year', label: 'Yil' },
];

export default function AdminPage() {
  const token = authStorage.getAccessToken();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<AdminDashboard>(`/admin/dashboard?period=${period}`, token);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboardni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-8">
      <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-[#f8fafc]/95 px-1 py-2 backdrop-blur-sm md:static md:bg-transparent md:p-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
              Operatsion markaz
            </p>
            <h2 className="text-lg font-bold text-[#0f172a] md:text-xl">Biznes analitikasi</h2>
            <p className="text-xs text-slate-500">
              Sotuv, ombor, mijozlar va yetkazish — bitta ko‘rinishda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    period === p.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Yangilash"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <DashboardKpiGrid kpis={data?.kpis ?? null} loading={loading} />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <DashboardSection
          title="Sotuv analitikasi"
          subtitle="Tushum, buyurtmalar, chek va yetkazish"
          className="lg:col-span-2"
        >
          <DashboardAnalyticsCharts timeSeries={data?.timeSeries ?? []} loading={loading} />
        </DashboardSection>

        <DashboardSection title="Jonli faollik" subtitle="So‘nggi buyurtmalar">
          <DashboardActivityFeed items={data?.recentActivity ?? []} loading={loading} />
        </DashboardSection>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <DashboardSection title="Top mahsulotlar" subtitle="Ombor va sotuv qarorlari uchun">
          <DashboardTopProducts items={data?.topProducts ?? []} loading={loading} />
        </DashboardSection>

        <DashboardSection title="Kam qolgan / tugagan" subtitle="Zudlik bilan to‘ldirish kerak">
          <DashboardInventoryAlerts
            lowStock={data?.inventory?.lowStock ?? []}
            outOfStock={data?.inventory?.outOfStock ?? []}
            loading={loading}
          />
        </DashboardSection>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DashboardScheduledSection kpis={data?.kpis ?? null} loading={loading} />

        <DashboardSection title="Mijozlar" subtitle="Qaytish va top xaridorlar">
          <DashboardCustomers customers={data?.customers ?? ({} as AdminDashboard['customers'])} loading={loading} />
        </DashboardSection>

        <DashboardSection title="Hududlar" subtitle="Yetkazish va kengayish">
          <DashboardDistricts items={data?.districts ?? []} loading={loading} />
        </DashboardSection>

        <DashboardSection title="Kuryerlar" subtitle="Yetkazish samaradorligi">
          <DashboardCouriers items={data?.couriers ?? []} loading={loading} />
        </DashboardSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <DashboardSection
          title="Kategoriyalar"
          subtitle="Hajm, tushum va sekin toifalar"
          className="lg:col-span-2"
        >
          <DashboardCategories
            categories={data?.categories ?? { items: [], highestVolume: null, highestRevenue: null, slowest: null }}
            topCategories={data?.topCategories ?? []}
            loading={loading}
          />
        </DashboardSection>

        <DashboardSection title="Tezkor amallar" subtitle="Operatsion qisqa yo‘llar">
          <DashboardQuickActions />
        </DashboardSection>
      </div>

      {data?.fastGrowingProducts && data.fastGrowingProducts.length > 0 ? (
        <DashboardSection title="Tez o‘sayotgan mahsulotlar" subtitle="Talab o‘sishi">
          <DashboardTopProducts items={data.fastGrowingProducts} />
        </DashboardSection>
      ) : null}

      {data?.generatedAt ? (
        <p className="text-center text-[10px] text-slate-400">
          Yangilangan: {new Date(data.generatedAt).toLocaleString('uz-UZ')}
        </p>
      ) : null}
    </div>
  );
}
