'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import type { BusinessDashboard } from '@/types/business-dashboard';

const STATUS_LABEL: Record<string, string> = {
  PENDING_SCHEDULE: 'Reja',
  NEW: 'Yangi',
  PICKING: 'Tayyorlanmoqda',
  READY: 'Tayyor',
  DELIVERING: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor',
};

type OrderRow = BusinessDashboard['recentOrders'][number] & {
  isScheduled?: boolean;
  deliverySlotLabel?: string | null;
};

type Props = {
  orders?: OrderRow[];
  onRefresh?: () => void;
};

export function BusinessOrdersPanel({ orders: initialOrders, onRefresh }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders ?? []);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const token = authStorage.getAccessToken();
      if (!token) return;
      const res = await api.get<{
        items: Array<{
          id: string;
          status: string;
          totalAmount: number;
          customerName: string;
          customerPhone: string;
          addressLabel: string | null;
          createdAt: string;
          isScheduled?: boolean;
          deliverySlotLabel?: string | null;
        }>;
      }>('/orders?page=1&limit=50', token);
      setOrders(
        res.items.map((o) => ({
          id: o.id,
          status: o.status,
          totalAmount: o.totalAmount,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          addressLabel: o.addressLabel,
          createdAt: o.createdAt,
          isScheduled: o.isScheduled,
          deliverySlotLabel: o.deliverySlotLabel,
          itemCount: 0,
        })),
      );
    };
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'ALL' && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, search]);

  return (
    <div className="space-y-3 p-4 pb-24">
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        placeholder="Qidirish: mijoz, telefon, ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="bb-scrollbar-hide flex gap-1.5 overflow-x-auto">
        {['ALL', 'PENDING_SCHEDULE', 'NEW', 'PICKING', 'DELIVERING', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${
              filter === s ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {s === 'ALL' ? 'Barchasi' : STATUS_LABEL[s] ?? s}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Buyurtma yoʻq</p>
        ) : (
          visible.map((o) => (
            <article
              key={o.id}
              className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#111827]">{o.customerName}</p>
                  <p className="text-xs text-slate-500">{o.customerPhone}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  {o.isScheduled && o.deliverySlotLabel ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                      {o.deliverySlotLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-sm font-bold tabular-nums">{formatMoneyUz(o.totalAmount)}</p>
              <p className="text-[11px] text-slate-500">
                {o.itemCount} ta · {new Date(o.createdAt).toLocaleString('uz-UZ')}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
