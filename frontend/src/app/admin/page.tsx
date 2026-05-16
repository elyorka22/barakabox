'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Building2,
  DollarSign,
  Package,
  Percent,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type AdminStats = { totalOrders: number; totalRevenue: number; activeProducts: number };
type Business = { id: string; displayName: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' };
type Order = {
  id: string;
  status: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
  customerName: string;
  createdAt?: string;
};

const DashboardCharts = dynamic(
  () => import('@/components/admin/dashboard-charts').then((mod) => mod.DashboardCharts),
  { ssr: false, loading: () => <div className="h-[220px] w-full animate-pulse rounded-xl bg-slate-100" /> },
);

function statusClass(status: Order['status']) {
  if (status === 'NEW') return 'bg-slate-100 text-slate-700';
  if (status === 'PICKING' || status === 'READY') return 'bg-amber-100 text-amber-800';
  if (status === 'DELIVERING') return 'bg-blue-100 text-blue-800';
  if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-800';
  return 'bg-rose-100 text-rose-800';
}

function StatCard(props: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{props.label}</p>
          {props.loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-1 truncate text-2xl font-bold tracking-tight text-[#0f172a]">{props.value}</p>
          )}
          {props.hint ? <p className="mt-1 text-[11px] text-emerald-600">{props.hint}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const token = authStorage.getAccessToken();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsData, ordersData, businessesData] = await Promise.all([
          api.get<AdminStats>('/admin/stats', token),
          api.get<Order[]>('/orders', token),
          api.get<Business[]>('/businesses', token),
        ]);
        setStats(statsData);
        setOrders(ordersData);
        setBusinesses(businessesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dashboardni yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const approvedBusinesses = useMemo(() => businesses.filter((b) => b.status === 'APPROVED').length, [businesses]);
  const pendingBusinesses = useMemo(() => businesses.filter((b) => b.status === 'PENDING').length, [businesses]);
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const recentActivity = useMemo(
    () =>
      orders.slice(0, 6).map((order) => ({
        id: order.id,
        text: `${order.customerName} · ${formatMoneyUz(order.totalAmount)}`,
        status: order.status,
        time: order.createdAt
          ? new Date(order.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '',
      })),
    [orders],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Dashboard</p>
          <h2 className="text-xl font-bold text-[#0f172a] md:text-2xl">Boshqaruv markazi</h2>
          <p className="text-sm text-slate-500">Buyurtmalar, tushum va faollik bir ko‘rinishda</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" />
          Jonli
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami buyurtmalar" value={stats?.totalOrders ?? 0} icon={ShoppingCart} loading={loading} />
        <StatCard
          label="Jami tushum"
          value={formatMoneyUz(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard label="Faol mahsulotlar" value={stats?.activeProducts ?? 0} icon={Package} loading={loading} />
        <StatCard
          label="Tasdiqlangan do‘konlar"
          value={approvedBusinesses}
          hint={pendingBusinesses > 0 ? `${pendingBusinesses} ta kutilmoqda` : undefined}
          icon={Building2}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Tushum va buyurtmalar</h3>
              <p className="text-xs text-slate-500">So‘nggi 6 oy</p>
            </div>
          </div>
          <div className="h-[260px] w-full min-w-0 overflow-hidden">
            {loading ? (
              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <DashboardCharts orders={orders} />
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0f172a]">So‘nggi faollik</h3>
          <p className="text-xs text-slate-500">Yangi buyurtmalar</p>
          <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
            {loading ? (
              <>
                <li className="h-14 animate-pulse rounded-xl bg-slate-100" />
                <li className="h-14 animate-pulse rounded-xl bg-slate-100" />
                <li className="h-14 animate-pulse rounded-xl bg-slate-100" />
              </>
            ) : recentActivity.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                Hozircha faollik yo‘q
              </li>
            ) : (
              recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                >
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#0f172a]">{item.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                      {item.time ? <span className="text-[10px] text-slate-500">{item.time}</span> : null}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#0f172a]">So‘nggi buyurtmalar</h3>
            <Link href="/admin/orders" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              Barchasi
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            ) : recentOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                Buyurtmalar yo‘q
              </p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0f172a]">#{order.id.slice(0, 8)}</p>
                    <p className="truncate text-xs text-slate-500">{order.customerName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums">{formatMoneyUz(order.totalAmount)}</p>
                    <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0f172a]">Tezkor amallar</h3>
          <div className="mt-3 space-y-2">
            {[
              { href: '/admin/products', label: 'Mahsulotlar', icon: Package },
              { href: '/admin/coupons', label: 'Kuponlar', icon: Percent },
              { href: '/admin/orders', label: 'Buyurtmalar', icon: ShoppingCart },
              { href: '/admin/businesses', label: 'Do‘konlar', icon: Building2 },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-[#0f172a] transition hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <action.icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate">{action.label}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
