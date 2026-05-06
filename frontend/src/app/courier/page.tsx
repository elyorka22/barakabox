'use client';

import { useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type Order = { id: string; status: 'READY' | 'DELIVERING' | 'DELIVERED'; totalAmount: string };

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
