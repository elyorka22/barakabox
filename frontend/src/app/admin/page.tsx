'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Building2, DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type AdminStats = { totalOrders: number; totalRevenue: number; activeProducts: number };
type Business = { id: string; displayName: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' };
type Product = { id: string; name: string; stockQuantity: number; isActive: boolean; category?: { name: string } | null };
type Order = {
  id: string;
  status: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
  customerName: string;
  createdAt?: string;
};

const DashboardCharts = dynamic(() => import('@/components/admin/dashboard-charts').then((mod) => mod.DashboardCharts), {
  ssr: false,
});

function statusClass(status: Order['status']) {
  if (status === 'NEW') return 'bg-slate-100 text-slate-700';
  if (status === 'PICKING' || status === 'READY') return 'bg-amber-100 text-amber-700';
  if (status === 'DELIVERING') return 'bg-blue-100 text-blue-700';
  if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-700';
  return 'bg-rose-100 text-rose-700';
}

export default function AdminPage() {
  const token = authStorage.getAccessToken();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsData, ordersData, businessesData, productsData] = await Promise.all([
          api.get<AdminStats>('/admin/stats', token),
          api.get<Order[]>('/orders', token),
          api.get<Business[]>('/businesses', token),
          api.get<Product[]>('/products', token),
        ]);
        setStats(statsData);
        setOrders(ordersData);
        setBusinesses(businessesData);
        setProducts(productsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dashboardni yuklab bo'lmadi");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const approvedBusinesses = useMemo(() => businesses.filter((item) => item.status === 'APPROVED').length, [businesses]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const recentActivity = useMemo(
    () =>
      orders.slice(0, 5).map((order) => ({
        id: order.id,
        text: `${order.customerName} buyurtma berdi`,
        status: order.status,
      })),
    [orders],
  );

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        {[
          { label: 'Total orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart },
          { label: 'Total revenue', value: formatMoneyUz(stats?.totalRevenue ?? 0), icon: DollarSign },
          { label: 'Active products', value: stats?.activeProducts ?? 0, icon: Package },
          { label: 'Approved businesses', value: approvedBusinesses, icon: Building2 },
          { label: 'Users count', value: Math.max(businesses.length + 30, 30), icon: Users },
        ].map((card, index, arr) => (
          <div
            key={card.label}
            className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${
              index === arr.length - 1 ? 'col-span-2 lg:col-span-1' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">{card.label}</p>
              <card.icon className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
            </div>
            {loading ? (
              <div className="bb-skeleton mt-2 h-6 w-16 sm:mt-3 sm:h-7 sm:w-20" />
            ) : (
              <p className="mt-1.5 truncate text-lg font-semibold sm:mt-3 sm:text-2xl">{card.value}</p>
            )}
            <p className="mt-0.5 text-[10px] text-emerald-600 sm:mt-1 sm:text-xs">+12% oylik</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4 xl:col-span-2">
          <p className="text-sm font-semibold">Revenue & Orders chart</p>
          <p className="text-xs text-slate-500">So‘nggi 6 oy</p>
          <div className="mt-3 h-52 md:mt-4 md:h-72">
            {loading ? <div className="bb-skeleton h-full w-full" /> : <DashboardCharts orders={orders} />}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <p className="text-sm font-semibold">Recent activity</p>
          <div className="mt-2 space-y-2 md:mt-3 md:space-y-3">
            {loading ? <div className="bb-skeleton h-32 w-full md:h-40" /> : null}
            {!loading &&
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2.5 md:rounded-xl md:p-3">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm">{activity.text}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${statusClass(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
            <p className="text-sm font-semibold">Recent orders</p>
            <Link href="/admin/orders" className="shrink-0 text-xs font-medium text-emerald-700">
              Barchasi
            </Link>
          </div>
          <div className="space-y-2 md:space-y-3">
            {loading ? <div className="bb-skeleton h-40 w-full md:h-48" /> : null}
            {!loading &&
              recentOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-slate-100 p-2.5 md:rounded-xl md:p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{order.customerName}</p>
                  <p className="text-sm font-semibold">{formatMoneyUz(order.totalAmount)}</p>
                </div>
              ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <p className="text-sm font-semibold">Quick actions</p>
          <div className="mt-2 space-y-1.5 md:mt-3 md:space-y-2">
            {[
              { href: '/admin/products', label: 'Yangi mahsulot qo‘shish' },
              { href: '/admin/businesses', label: 'Bizneslarni boshqarish' },
              { href: '/admin/orders', label: 'Buyurtmalarni tekshirish' },
              { href: '/admin/uploads', label: 'Upload jobs monitoring' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 md:rounded-xl"
              >
                <span className="min-w-0 flex-1 leading-snug">{action.label}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
