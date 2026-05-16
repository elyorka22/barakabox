'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { OrderFinancialBreakdown } from '@/components/order/order-financial-breakdown';
import { formatMoneyUz } from '@/lib/format';

type OrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  subtotalAmount?: number | string;
  deliveryFee?: number | string;
  cashbackRedeemTiyin?: number | string;
  couponDiscountTiyin?: number | string;
  couponCode?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  manualAddress?: string | null;
  deliveryNote?: string | null;
  addressLabel?: string | null;
  assignedPicker?: { fullName: string } | null;
  assignedCourier?: { fullName: string } | null;
};

const STATUS_OPTIONS: OrderStatus[] = ['NEW', 'PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];

function mapsLinks(lat: number, lng: number) {
  const g = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
  const y = `https://yandex.uz/maps/?pt=${encodeURIComponent(`${lng},${lat}`)}&z=18`;
  return { g, y };
}

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
        const searchMatch =
          q.length === 0 ||
          order.customerName.toLowerCase().includes(q) ||
          order.customerPhone.includes(q) ||
          (order.formattedAddress?.toLowerCase().includes(q) ?? false);
        return statusMatch && searchMatch;
      }),
    [orders, statusFilter, search],
  );

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await api.patch(`/orders/${orderId}/status`, { status }, token);
    await load();
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        <h2 className="text-base font-semibold md:text-lg">Orders</h2>
        <p className="text-xs text-slate-500 md:text-sm">Status timeline, filtering va detail drawer.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm md:rounded-xl"
            placeholder="Mijoz qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm md:rounded-xl"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | OrderStatus)}
          >
            <option value="ALL">Barcha status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium md:rounded-xl"
            onClick={() => void load()}
          >
            Yangilash
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        {!loading && visible.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Buyurtma topilmadi</p>
        ) : null}
        {visible.map((order) => (
          <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">
                  {order.customerName} · {order.customerPhone}
                </p>
                {order.addressLabel ? (
                  <p className="text-xs font-medium text-emerald-800">Yorliq: {order.addressLabel}</p>
                ) : null}
                <p className="text-xs text-slate-500">{order.deliveryAddress}</p>
                {order.manualAddress ? (
                  <p className="text-xs font-medium text-amber-900">Qo‘lda: {order.manualAddress}</p>
                ) : null}
                {order.formattedAddress ? (
                  <p className="text-xs text-slate-600">OSM: {order.formattedAddress}</p>
                ) : null}
                {order.latitude != null && order.longitude != null ? (
                  <p className="text-xs font-mono text-slate-700">
                    {Number(order.latitude).toFixed(6)}, {Number(order.longitude).toFixed(6)}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatMoneyUz(order.totalAmount)}</p>
                <p className="text-xs text-slate-500">Picker: {order.assignedPicker?.fullName ?? '-'}</p>
                <p className="text-xs text-slate-500">Courier: {order.assignedCourier?.fullName ?? '-'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="min-h-11 min-w-[8.5rem] rounded-lg border border-slate-200 px-2 text-xs md:min-h-10"
                value={order.status}
                onChange={(e) => void updateStatus(order.id, e.target.value as OrderStatus)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs" onClick={() => setSelected(order)}>
                Detail
              </button>
              {order.latitude != null && order.longitude != null ? (
                <>
                  <a
                    href={mapsLinks(Number(order.latitude), Number(order.longitude)).g}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#16A34A] px-2 py-1 text-xs font-semibold text-white"
                  >
                    Google Maps
                  </a>
                  <a
                    href={mapsLinks(Number(order.latitude), Number(order.longitude)).y}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    Yandex
                  </a>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-end">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4">
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
              {selected.addressLabel ? <p>Yorliq: {selected.addressLabel}</p> : null}
              <p>Manzil (yuborilgan): {selected.deliveryAddress}</p>
              {selected.manualAddress ? <p>Qo‘lda kiritilgan: {selected.manualAddress}</p> : null}
              {selected.formattedAddress ? <p>OSM manzil: {selected.formattedAddress}</p> : null}
              {selected.deliveryNote ? <p>Izoh: {selected.deliveryNote}</p> : null}
              {selected.latitude != null && selected.longitude != null ? (
                <>
                  <p className="font-mono text-xs">
                    Koordinata: {Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={mapsLinks(Number(selected.latitude), Number(selected.longitude)).g}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Google Maps ochish
                    </a>
                    <a
                      href={mapsLinks(Number(selected.latitude), Number(selected.longitude)).y}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                    >
                      Yandex ochish
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-amber-800">Koordinatalar yo&apos;q (eski buyurtma)</p>
              )}
              <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <OrderFinancialBreakdown
                  subtotalAmount={Number(selected.subtotalAmount ?? 0)}
                  deliveryFee={Number(selected.deliveryFee ?? 0)}
                  couponDiscountTiyin={Number(selected.couponDiscountTiyin ?? 0)}
                  cashbackRedeemTiyin={Number(selected.cashbackRedeemTiyin ?? 0)}
                />
                {selected.couponCode ? (
                  <p className="mt-2 text-xs text-slate-500">Kupon: {selected.couponCode}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
