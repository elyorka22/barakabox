'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdminDashboard } from '@/types/admin-dashboard';

type ChartTab = 'revenue' | 'orders' | 'basket' | 'delivery';

export function DashboardAnalyticsCharts(props: {
  timeSeries: AdminDashboard['timeSeries'];
  loading?: boolean;
}) {
  const [tab, setTab] = useState<ChartTab>('revenue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(
    () =>
      props.timeSeries.map((row) => ({
        label: row.label,
        revenue: row.revenue,
        orders: row.orders,
        avgBasket: row.avgBasket,
        deliverySuccessRate: row.deliverySuccessRate,
      })),
    [props.timeSeries],
  );

  const tabs: { id: ChartTab; label: string }[] = [
    { id: 'revenue', label: 'Tushum' },
    { id: 'orders', label: 'Buyurtmalar' },
    { id: 'basket', label: "O'rtacha chek" },
    { id: 'delivery', label: 'Yetkazish %' },
  ];

  if (props.loading || !mounted) {
    return <div className="h-[220px] w-full animate-pulse rounded-lg bg-slate-100" />;
  }

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="h-[220px] w-full min-w-0 sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          {tab === 'revenue' ? (
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="dashRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                formatter={(v) => [`${Number(v).toLocaleString('uz-UZ')} so'm`, 'Tushum']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#dashRev)" />
            </AreaChart>
          ) : null}
          {tab === 'orders' ? (
            <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }} />
              <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          ) : null}
          {tab === 'basket' ? (
            <LineChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                formatter={(v) => [`${Number(v).toLocaleString('uz-UZ')} so'm`, 'Chek']}
              />
              <Line type="monotone" dataKey="avgBasket" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          ) : null}
          {tab === 'delivery' ? (
            <LineChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                formatter={(v) => [`${v}%`, 'Yetkazilgan']}
              />
              <Line type="monotone" dataKey="deliverySuccessRate" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
