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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart },
          { label: 'Total revenue', value: formatMoneyUz(stats?.totalRevenue ?? 0), icon: DollarSign },
          { label: 'Active products', value: stats?.activeProducts ?? 0, icon: Package },
          { label: 'Approved businesses', value: approvedBusinesses, icon: Building2 },
          { label: 'Users count', value: Math.max(businesses.length + 30, 30), icon: Users },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{card.label}</p>
              <card.icon className="h-4 w-4 text-slate-500" />
            </div>
            {loading ? <div className="bb-skeleton mt-3 h-7 w-20" /> : <p className="mt-3 text-2xl font-semibold">{card.value}</p>}
            <p className="mt-1 text-xs text-emerald-600">+12% oylik trend</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <p className="text-sm font-semibold">Revenue & Orders chart</p>
          <p className="text-xs text-slate-500">So‘nggi 6 oy</p>
          <div className="mt-4 h-72">{loading ? <div className="bb-skeleton h-full w-full" /> : <DashboardCharts orders={orders} />}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Recent activity</p>
          <div className="mt-3 space-y-3">
            {loading ? <div className="bb-skeleton h-40 w-full" /> : null}
            {!loading &&
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
                  <Activity className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm">{activity.text}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Recent orders</p>
            <Link href="/admin/orders" className="text-xs font-medium text-emerald-700">
              Barchasini ko‘rish
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? <div className="bb-skeleton h-48 w-full" /> : null}
            {!loading &&
              recentOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(order.status)}`}>{order.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{order.customerName}</p>
                  <p className="text-sm font-semibold">{formatMoneyUz(order.totalAmount)}</p>
                </div>
              ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Quick actions</p>
          <div className="mt-3 space-y-2">
            {[
              { href: '/admin/products', label: 'Yangi mahsulot qo‘shish' },
              { href: '/admin/businesses', label: 'Bizneslarni boshqarish' },
              { href: '/admin/orders', label: 'Buyurtmalarni tekshirish' },
              { href: '/admin/uploads', label: 'Upload jobs monitoring' },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50">
                <span>{action.label}</span>
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
