'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { DashboardCharts } from '@/components/admin/dashboard-charts';

type Order = {
  id: string;
  status: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
};

export default function AdminAnalyticsPage() {
  const token = authStorage.getAccessToken();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      const data = await api.get<Order[]>('/orders', token);
      setOrders(data);
      setLoading(false);
    };
    void load();
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="text-sm text-slate-500">Orders va revenue analitik ko‘rinishi.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-80">{loading ? <div className="bb-skeleton h-full w-full" /> : <DashboardCharts orders={orders} />}</div>
      </div>
    </div>
  );
}
