'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import type { PickerOrder } from '@/lib/picker-types';
import { internalOrderLabel } from '@/lib/picker-order-utils';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Tez orada';
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} soat ${m} daq`;
  return `${m} daq`;
}

export function PickerScheduledPanel() {
  const [items, setItems] = useState<PickerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      const data = await api.get<PickerOrder[]>('/orders/picker/scheduled', token);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [load]);

  void tick;

  if (loading) {
    return <p className="text-sm text-slate-500">Rejalashtirilgan buyurtmalar yuklanmoqda…</p>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 space-y-2">
      <h2 className="text-sm font-bold text-violet-900">Rejalashtirilgan buyurtmalar</h2>
      <ul className="space-y-2">
        {items.map((order) => {
          const starts = order.scheduledAt ? new Date(order.scheduledAt).getTime() : 0;
          const countdown = starts ? formatCountdown(starts - Date.now()) : '—';
          return (
            <li
              key={order.id}
              className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2.5 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-[#111827]">#{internalOrderLabel(order.id)}</span>
                <span className="rounded-md bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-900">
                  {countdown}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-violet-900">
                {order.deliverySlotLabel ?? 'Yetkazish vaqti'}
              </p>
              <p className="mt-0.5 text-[11px] text-violet-800">{order.items.length} ta mahsulot</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
