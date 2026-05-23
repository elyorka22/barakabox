'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Activity, ShoppingBag, Users, Zap } from 'lucide-react';
import { authStorage } from '@/lib/api';
import { fetchAdminAnalyticsOverview, fetchAdminAnalyticsRealtime } from '@/lib/admin-analytics-api';
import { formatMoneyUz } from '@/lib/format';
import { KpiCard } from '@/components/admin/dashboard/dashboard-ui';
import type { AdminAnalyticsOverview, AdminAnalyticsPeriod, AdminAnalyticsRealtime } from '@/types/admin-analytics';

const PERIODS: { id: AdminAnalyticsPeriod; label: string }[] = [
  { id: 'day', label: '24 soat' },
  { id: 'week', label: '7 kun' },
  { id: 'month', label: '30 kun' },
];

export function AdminAnalyticsDashboard() {
  const [period, setPeriod] = useState<AdminAnalyticsPeriod>('week');
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [realtime, setRealtime] = useState<AdminAnalyticsRealtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setError('');
    try {
      const [ov, rt] = await Promise.all([
        fetchAdminAnalyticsOverview(period, token),
        fetchAdminAnalyticsRealtime(token),
      ]);
      setOverview(ov);
      setRealtime(rt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analitikani yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    const id = setInterval(() => {
      void fetchAdminAnalyticsRealtime(token).then(setRealtime).catch(() => undefined);
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const v = overview?.visitors;
  const e = overview?.ecommerce;
  const b = overview?.behavior;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Analitika</h1>
          <p className="text-sm text-slate-500">Jonli va tarixiy ko‘rsatkichlar</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === p.id ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard
          label="Hozir onlayn"
          value={realtime?.onlineUsers ?? v?.onlineNow ?? 0}
          loading={loading && !realtime}
        />
        <KpiCard
          label="Tashriflar"
          value={v?.uniqueVisitors ?? 0}
          growth={v?.uniqueVisitorsGrowth}
          loading={loading}
        />
        <KpiCard
          label="Buyurtmalar"
          value={e?.orders ?? 0}
          growth={e?.ordersGrowth}
          loading={loading}
        />
        <KpiCard
          label="Daromad"
          value={e ? formatMoneyUz(e.revenue) : '—'}
          growth={e?.revenueGrowth}
          loading={loading}
        />
      </div>

      <section className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-[#0f172a]">Jonli</h2>
          <span className="ml-auto text-[10px] text-slate-400">
            {realtime?.at ? new Date(realtime.at).toLocaleTimeString('uz-UZ') : '—'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-4">
          <div className="rounded-lg bg-white/80 px-2 py-2">
            <p className="text-lg font-bold text-emerald-700">{realtime?.todayOrders ?? 0}</p>
            <p className="text-[10px] text-slate-500">Bugun buyurtma</p>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-2">
            <p className="text-sm font-bold text-[#0f172a]">
              {formatMoneyUz(realtime?.todayRevenue ?? 0)}
            </p>
            <p className="text-[10px] text-slate-500">Bugun daromad</p>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-2">
            <p className="text-lg font-bold text-[#0f172a]">{realtime?.activePickers ?? 0}</p>
            <p className="text-[10px] text-slate-500">Faol picker</p>
          </div>
          <div className="rounded-lg bg-white/80 px-2 py-2">
            <p className="text-lg font-bold text-[#0f172a]">{realtime?.activeCouriers ?? 0}</p>
            <p className="text-[10px] text-slate-500">Faol kuryer</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#0f172a]">Voronka</h3>
        <div className="h-52 w-full">
          {loading ? (
            <div className="h-full animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.funnel ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="views" stackId="1" stroke="#94a3b8" fill="#f1f5f9" />
                <Area type="monotone" dataKey="carts" stackId="2" stroke="#3d9e72" fill="#d1fae5" />
                <Area type="monotone" dataKey="orders" stackId="3" stroke="#166534" fill="#86efac" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <MetricBlock title="Xulq-atvor" icon={Users} loading={loading}>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <li className="flex justify-between">
              <span>Sahifa ko‘rishlari</span>
              <span className="font-semibold tabular-nums">{v?.pageViews ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Qidiruvlar</span>
              <span className="font-semibold tabular-nums">{b?.searches ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Mahsulot ko‘rildi</span>
              <span className="font-semibold tabular-nums">{b?.productViews ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Savatga qo‘shildi</span>
              <span className="font-semibold tabular-nums">{b?.addToCart ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Checkout boshlandi</span>
              <span className="font-semibold tabular-nums">{b?.checkouts ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Konversiya</span>
              <span className="font-semibold text-emerald-700">{e?.conversionRate ?? 0}%</span>
            </li>
          </ul>
        </MetricBlock>

        <MetricBlock title="Yetkazish" icon={Activity} loading={loading}>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <li className="flex justify-between">
              <span>O‘rtacha yetkazish</span>
              <span className="font-semibold">
                {overview?.delivery.avgDeliveryMinutes != null
                  ? `${overview.delivery.avgDeliveryMinutes} daq`
                  : '—'}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Rejalashtirilgan</span>
              <span className="font-semibold tabular-nums">{e?.scheduledOrders ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Tezkor</span>
              <span className="font-semibold tabular-nums">{e?.instantOrders ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Ro‘yxatdan o‘tgan</span>
              <span className="font-semibold tabular-nums">{v?.registeredVisitors ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Mehmon</span>
              <span className="font-semibold tabular-nums">{v?.anonymousVisitors ?? 0}</span>
            </li>
          </ul>
        </MetricBlock>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ProductList title="Ko‘p ko‘rilgan" items={overview?.products.topViewed ?? []} loading={loading} />
        <ProductList title="Savatga qo‘shilgan" items={overview?.products.topAdded ?? []} loading={loading} />
      </div>

      <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#0f172a]">Band soatlar</h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview?.delivery.busiestHours ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={24} />
              <Tooltip />
              <Bar dataKey="orders" fill="#3d9e72" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {realtime?.liveOrders?.length ? (
        <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-[#0f172a]">So‘nggi buyurtmalar</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {realtime.liveOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-[#0f172a]">
                  {o.orderNumber ? `#${o.orderNumber}` : o.id.slice(-6)}
                </span>
                <span className="text-slate-500">{o.status}</span>
                <span className="font-semibold tabular-nums">{formatMoneyUz(o.totalAmount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview?.errors ? (
        <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Xatolar va sekinlik</p>
          <p className="mt-1 text-xs">
            API: {overview.errors.apiErrors} · Savat: {overview.errors.cartFails} · Frontend:{' '}
            {overview.errors.frontendErrors} · Sekin: {overview.errors.slowRequests}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function MetricBlock(props: {
  title: string;
  icon: typeof Users;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const Icon = props.icon;
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-[#0f172a]">{props.title}</h3>
      </div>
      {props.loading ? <div className="h-24 animate-pulse rounded-lg bg-slate-100" /> : props.children}
    </section>
  );
}

function ProductList(props: {
  title: string;
  items: Array<{ productId: string; title: string; count: number }>;
  loading?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-[#0f172a]">{props.title}</h3>
      {props.loading ? (
        <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
      ) : props.items.length === 0 ? (
        <p className="text-xs text-slate-400">Ma&apos;lumot yo‘q</p>
      ) : (
        <ul className="space-y-1.5">
          {props.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-2 text-sm">
              <span className="line-clamp-1 text-slate-600">{item.title}</span>
              <span className="shrink-0 font-semibold tabular-nums text-emerald-700">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
