'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';

type OrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number | string;
  customerPhone: string;
  customerName?: string;
  deliveryAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  addressLabel?: string | null;
};

export default function CourierPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<Order[]>('/orders/courier', token);
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buyurtmalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateStatus = async (orderId: string, action: 'start-delivery' | 'delivered') => {
    try {
      const token = authStorage.getAccessToken();
      await api.patch(`/orders/${orderId}/${action}`, {}, token);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Statusni yangilab bo'lmadi");
    }
  };

  const mapsHref =
    (lat: number, lng: number) =>
      `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;

  return (
    <div className="px-3 pb-28 pt-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">Mening yetkazib berishlarim</p>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 active:bg-slate-50"
          onClick={() => {
            setLoading(true);
            void loadOrders();
          }}
        >
          Yangilash
        </button>
      </div>
      {loading ? <p className="text-center text-sm text-slate-500">Yuklanmoqda…</p> : null}
      {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {!loading && orders.length === 0 ? (
        <p className="rounded-2xl bg-white py-10 text-center text-sm text-slate-500 shadow-sm">Navbatda buyurtma yo‘q</p>
      ) : null}
      <ul className="space-y-4">
        {orders.map((order) => {
          const lat = order.latitude ?? null;
          const lng = order.longitude ?? null;
          const isReady = order.status === 'READY';
          const isRoad = order.status === 'DELIVERING';

          return (
            <li key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-lg font-bold text-slate-900">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">
                  {isReady ? 'Kutmoqda' : null}
                  {isRoad ? 'Yo‘lda' : null}
                  {!isReady && !isRoad ? order.status : null}
                </p>
              </div>
              <div className="space-y-2 px-4 py-3 text-sm">
                <a href={`tel:${order.customerPhone}`} className="block text-lg font-bold text-emerald-700 underline-offset-2">
                  {order.customerPhone}
                </a>
                {order.customerName ? <p className="text-slate-700">{order.customerName}</p> : null}
                <p className="font-semibold text-slate-900">{formatMoneyUz(order.totalAmount)}</p>
                {order.addressLabel ? <p className="text-xs font-medium text-amber-900">{order.addressLabel}</p> : null}
                {order.deliveryAddress ? <p className="text-xs leading-relaxed text-slate-600">{order.deliveryAddress}</p> : null}
                {order.formattedAddress ? <p className="text-xs text-slate-500">{order.formattedAddress}</p> : null}
                {lat != null && lng != null ? (
                  <a
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
                    href={mapsHref(lat, lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Marshrut (xarita)
                  </a>
                ) : null}
              </div>
              <div className="grid gap-2 px-3 pb-4 pt-1">
                {isReady ? (
                  <button
                    type="button"
                    className="min-h-[56px] rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-md active:scale-[0.99]"
                    onClick={() => void updateStatus(order.id, 'start-delivery')}
                  >
                    Qabul qilish
                  </button>
                ) : null}
                {isRoad ? (
                  <>
                    <div className="flex min-h-[48px] items-center justify-center rounded-2xl bg-amber-100 text-base font-bold text-amber-950">
                      Yo‘lda
                    </div>
                    <button
                      type="button"
                      className="min-h-[56px] rounded-2xl bg-slate-900 text-lg font-bold text-white active:scale-[0.99]"
                      onClick={() => void updateStatus(order.id, 'delivered')}
                    >
                      Yetkazildi
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
