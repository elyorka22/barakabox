'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type OrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  assignedPicker?: { fullName: string } | null;
  assignedCourier?: { fullName: string } | null;
};

const STATUS_OPTIONS: OrderStatus[] = ['NEW', 'PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const token = authStorage.getAccessToken();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Order[]>('/orders', token);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buyurtmalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token]);

  const visible = useMemo(
    () =>
      orders.filter((order) => {
        const statusMatch = statusFilter === 'ALL' || order.status === statusFilter;
        const q = search.trim().toLowerCase();
        const searchMatch = q.length === 0 || order.customerName.toLowerCase().includes(q) || order.customerPhone.includes(q);
        return statusMatch && searchMatch;
      }),
    [orders, statusFilter, search],
  );

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await api.patch(`/orders/${orderId}/status`, { status }, token);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Orders</h2>
        <p className="text-sm text-slate-500">Status timeline, filtering va detail drawer.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Mijoz qidirish" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | OrderStatus)}>
            <option value="ALL">Barcha status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => void load()}>
            Yangilash
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        {!loading && visible.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Buyurtma topilmadi</p> : null}
        {visible.map((order) => (
          <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">{order.customerName} · {order.customerPhone}</p>
                <p className="text-xs text-slate-500">{order.deliveryAddress}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatMoneyUz(order.totalAmount)}</p>
                <p className="text-xs text-slate-500">Picker: {order.assignedPicker?.fullName ?? '-'}</p>
                <p className="text-xs text-slate-500">Courier: {order.assignedCourier?.fullName ?? '-'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={order.status} onChange={(e) => void updateStatus(order.id, e.target.value as OrderStatus)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs" onClick={() => setSelected(order)}>
                Detail
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-end">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Order details</h3>
              <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => setSelected(null)}>
                Yopish
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <p>ID: {selected.id}</p>
              <p>Status timeline: NEW → PICKING → READY → DELIVERING → DELIVERED/CANCELLED</p>
              <p>Mijoz: {selected.customerName}</p>
              <p>Telefon: {selected.customerPhone}</p>
              <p>Manzil: {selected.deliveryAddress}</p>
              <p>Jami: {formatMoneyUz(selected.totalAmount)}</p>
            </div>
          </div>
        </div>
      ) : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
