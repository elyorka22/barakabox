'use client';

import { useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type OrderItem = {
  id: string;
  title: string;
  quantity: number;
};

type Order = {
  id: string;
  status: 'NEW' | 'PICKING';
  items: OrderItem[];
};

export default function PickerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<Order[]>('/orders/picker', token);
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buyurtmalarni yuklab bo‘lmadi');
    }
  };

  const applyAction = async (orderId: string, action: 'start-picking' | 'ready') => {
    try {
      const token = authStorage.getAccessToken();
      await api.patch(`/orders/${orderId}/${action}`, {}, token);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statusni yangilab bo‘lmadi');
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Yig'uvchi paneli</h1>
        <button className="bb-btn-primary mt-4" onClick={loadOrders}>Buyurtmalarni yuklash</button>
        {error ? <p className="mt-3 text-red-600">{error}</p> : null}
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              <p className="bb-secondary">Status: {order.status}</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.title} x {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button className="bb-btn-secondary" onClick={() => applyAction(order.id, 'start-picking')}>
                  Boshlash
                </button>
                <button className="bb-btn-secondary" onClick={() => applyAction(order.id, 'ready')}>
                  Tayyor
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
