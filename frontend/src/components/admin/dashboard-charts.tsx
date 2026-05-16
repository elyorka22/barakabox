'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Order = {
  id: string;
  status: string;
  totalAmount: string;
  createdAt?: string;
};

type ChartTab = 'revenue' | 'orders';

function buildMonthlySeries(orders: Order[]) {
  const now = new Date();
  const buckets: { key: string; label: string; revenue: number; orders: number }[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString('uz-UZ', { month: 'short' });
    buckets.push({ key, label, revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    const created = order.createdAt ? new Date(order.createdAt) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (!bucket) continue;
    bucket.revenue += Number(order.totalAmount || 0);
    bucket.orders += 1;
  }

  return buckets.map(({ label, revenue, orders: count }) => ({
    month: label,
    revenue,
    orders: count,
  }));
}

export function DashboardCharts({ orders }: { orders: Order[] }) {
  const [tab, setTab] = useState<ChartTab>('revenue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => buildMonthlySeries(orders), [orders]);

  if (!mounted) {
    return <div className="h-full min-h-[220px] w-full rounded-xl bg-slate-50" aria-hidden />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('revenue')}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
            tab === 'revenue' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
          }`}
        >
          Tushum
        </button>
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
            tab === 'orders' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
          }`}
        >
          Buyurtmalar
        </button>
      </div>
      <div className="min-h-0 flex-1 w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          {tab === 'revenue' ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v) => [`${Number(v).toLocaleString('uz-UZ')} so'm`, 'Tushum']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#revFill)" />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="orders" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
