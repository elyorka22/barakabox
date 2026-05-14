'use client';

import { useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type Order = {
  id: string;
  status: 'READY' | 'DELIVERING' | 'DELIVERED';
  totalAmount: string;
  deliveryAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  addressLabel?: string | null;
};

export default function CourierPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<Order[]>('/orders/courier', token);
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buyurtmalarni yuklab bo'lmadi");
    }
  };

  const updateStatus = async (orderId: string, action: 'start-delivery' | 'delivered') => {
    try {
      const token = authStorage.getAccessToken();
      await api.patch(`/orders/${orderId}/${action}`, {}, token);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Statusni yangilab bo'lmadi");
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Kuryer paneli</h1>
        <button className="bb-btn-primary mt-4" onClick={loadOrders}>Buyurtmalarni yuklash</button>
        {error ? <p className="mt-3 text-red-600">{error}</p> : null}
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              <p className="bb-secondary">Status: {order.status}</p>
              <p className="bb-secondary">Jami: {formatMoneyUz(order.totalAmount)}</p>
              {order.addressLabel ? (
                <p className="mt-1 text-xs font-medium text-emerald-800">Yorliq: {order.addressLabel}</p>
              ) : null}
              {order.deliveryAddress ? <p className="mt-1 text-xs text-slate-600">{order.deliveryAddress}</p> : null}
              {order.formattedAddress ? <p className="text-xs text-slate-500">{order.formattedAddress}</p> : null}
              {order.latitude != null && order.longitude != null ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    className="text-xs font-semibold text-[#16A34A] underline"
                    href={`https://www.google.com/maps?q=${encodeURIComponent(`${order.latitude},${order.longitude}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps
                  </a>
                  <a
                    className="text-xs font-semibold text-slate-600 underline"
                    href={`https://yandex.uz/maps/?pt=${encodeURIComponent(`${order.longitude},${order.latitude}`)}&z=18`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Yandex
                  </a>
                </div>
              ) : null}
              <div className="mt-2 flex gap-2">
                <button className="bb-btn-secondary" onClick={() => updateStatus(order.id, 'start-delivery')}>
                  Yetkazishni boshlash
                </button>
                <button className="bb-btn-secondary" onClick={() => updateStatus(order.id, 'delivered')}>
                  Yetkazildi
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <MobileNav />
    </main>
  );
}
