'use client';

import { useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type Order = { id: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELIVERING' | 'COMPLETED'; totalAmount: string };

export default function CourierPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<Order[]>('/orders', token);
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    }
  };

  const updateStatus = async (orderId: string, status: 'DELIVERING' | 'COMPLETED') => {
    try {
      const token = authStorage.getAccessToken();
      await api.patch(`/orders/${orderId}/status`, { status }, token);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell max-w-5xl">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Courier panel</h1>
        <button className="bb-btn-primary mt-4" onClick={loadOrders}>Load orders</button>
        {error ? <p className="mt-3 text-red-600">{error}</p> : null}
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              <p className="bb-secondary">Status: {order.status}</p>
              <p className="bb-secondary">Total: ${order.totalAmount}</p>
              <div className="mt-2 flex gap-2">
                <button className="bb-btn-secondary" onClick={() => updateStatus(order.id, 'DELIVERING')}>
                  Mark delivering
                </button>
                <button className="bb-btn-secondary" onClick={() => updateStatus(order.id, 'COMPLETED')}>
                  Mark completed
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
