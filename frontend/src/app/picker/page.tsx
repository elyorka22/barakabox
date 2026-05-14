'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatQuantityWithUnit, normalizeIncomingProductUnit, DEFAULT_PRODUCT_UNIT } from '@onlinebozor/product-units';

type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitType?: string;
};

type OrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

type Order = {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
};

export default function PickerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<Order[]>('/orders/picker', token);
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buyurtmalarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

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
    <div className="px-3 pb-28 pt-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">Yig‘uv navbati</p>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900 active:bg-slate-50"
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
        <p className="rounded-2xl bg-white py-10 text-center text-sm text-slate-500 shadow-sm">Buyurtma yo‘q</p>
      ) : null}
      <ul className="space-y-4">
        {orders.map((order) => {
          const isNew = order.status === 'NEW';
          const isPicking = order.status === 'PICKING';

          return (
            <li key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-lg font-bold text-slate-900">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-slate-500">
                  {isNew ? 'Kutilmoqda' : null}
                  {isPicking ? 'Yig‘ilmoqda' : null}
                  {!isNew && !isPicking ? order.status : null}
                </p>
              </div>
              <ul className="divide-y divide-slate-100 px-4 py-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span className="font-medium text-slate-800">{item.title}</span>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {formatQuantityWithUnit(
                        item.quantity,
                        normalizeIncomingProductUnit(item.unitType) ?? DEFAULT_PRODUCT_UNIT,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 px-3 pb-4 pt-1">
                {isNew ? (
                  <button
                    type="button"
                    className="min-h-[56px] rounded-2xl bg-orange-600 text-lg font-bold text-white shadow-md active:scale-[0.99]"
                    onClick={() => void applyAction(order.id, 'start-picking')}
                  >
                    Yig‘ishni boshlash
                  </button>
                ) : null}
                {isPicking ? (
                  <>
                    <div className="flex min-h-[48px] items-center justify-center rounded-2xl bg-orange-50 text-base font-bold text-orange-950">
                      Yig‘ilmoqda
                    </div>
                    <button
                      type="button"
                      className="min-h-[56px] rounded-2xl bg-slate-900 text-lg font-bold text-white active:scale-[0.99]"
                      onClick={() => void applyAction(order.id, 'ready')}
                    >
                      Tayyor
                    </button>
                    <p className="pb-1 text-center text-xs text-slate-500">Keyingi bosqich: kuryerga topshiriladi</p>
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
