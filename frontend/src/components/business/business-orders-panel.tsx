'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import type { StoreOrderListItem, StoreOrderSummary, StoreOrdersPage } from '@/types/store-panel-orders';

const STATUS_LABEL: Record<string, string> = {
  PENDING_SCHEDULE: 'Reja',
  NEW: 'Yangi',
  PICKING: 'Yig‘ilmoqda',
  READY: 'Tayyor',
  DELIVERING: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor',
};

type OrderDetail = {
  id: string;
  timeline: Array<{ key: string; label: string; at: string | null; done: boolean }>;
  items: Array<{ id: string; title: string; quantity: number; price: number }>;
  pickerName: string | null;
  courierName: string | null;
};

type Props = {
  onRefresh?: () => void;
};

export function BusinessOrdersPanel({ onRefresh }: Props) {
  const [orders, setOrders] = useState<StoreOrderListItem[]>([]);
  const [summary, setSummary] = useState<StoreOrderSummary | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (filter !== 'ALL') params.set('status', filter);
      if (search.trim()) params.set('q', search.trim());

      const [sum, page] = await Promise.all([
        api.get<StoreOrderSummary>('/businesses/panel/orders/summary', token),
        api.get<StoreOrdersPage>(`/businesses/panel/orders?${params.toString()}`, token),
      ]);
      setSummary(sum);
      setOrders(page.items);
      onRefresh?.();
    } catch {
      setOrders([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filter, search, onRefresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const fetchOrderDetail = async (orderId: string): Promise<OrderDetail | null> => {
    const token = authStorage.getAccessToken();
    if (!token) return null;
    return api.get<OrderDetail>(`/businesses/panel/orders/${orderId}`, token);
  };

  const toggleDetail = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(orderId);
    const data = await fetchOrderDetail(orderId);
    setDetail(data);
  };

  const summaryCards = useMemo(
    () => [
      { label: 'Faol', value: summary?.active ?? 0 },
      { label: 'Yig‘ish', value: summary?.picking ?? 0 },
      { label: 'Tayyor', value: summary?.ready ?? 0 },
      { label: 'Yo‘lda', value: summary?.delivering ?? 0 },
    ],
    [summary],
  );

  return (
    <div className="space-y-3 p-4 pb-24">
      <div className="grid grid-cols-4 gap-2">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white px-2 py-2 text-center shadow-sm ring-1 ring-black/[0.04]">
            <p className="text-[9px] font-medium uppercase text-slate-500">{c.label}</p>
            <p className="text-lg font-bold tabular-nums text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>

      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        placeholder="Qidirish: mijoz, telefon, raqam"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void load();
        }}
      />

      <div className="bb-scrollbar-hide flex gap-1.5 overflow-x-auto">
        {['ALL', 'PENDING_SCHEDULE', 'NEW', 'PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'].map(
          (s) => (
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
          ),
        )}
      </div>

      {loading ? <p className="text-center text-sm text-slate-500">Yuklanmoqda…</p> : null}

      <div className="space-y-2">
        {!loading && orders.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Buyurtma yoʻq</p>
        ) : (
          orders.map((o) => (
            <article
              key={o.id}
              className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]"
            >
              <button type="button" className="w-full text-left" onClick={() => void toggleDetail(o.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#111827]">{o.customerName}</p>
                    <p className="text-xs text-slate-500">{o.customerPhone}</p>
                    {o.orderNumber ? (
                      <p className="text-[10px] text-slate-400">#{o.orderNumber}</p>
                    ) : null}
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
                {o.pickerName || o.courierName ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    {o.pickerName ? `Yig‘uvchi: ${o.pickerName}` : ''}
                    {o.pickerName && o.courierName ? ' · ' : ''}
                    {o.courierName ? `Kuryer: ${o.courierName}` : ''}
                  </p>
                ) : null}
              </button>

              {expandedId === o.id && detail ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-700">Jarayon</p>
                  <ul className="mt-2 space-y-1.5">
                    {detail.timeline.map((step) => (
                      <li key={step.key} className="flex items-center gap-2 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${step.done ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        />
                        <span className={step.done ? 'text-[#111827]' : 'text-slate-400'}>{step.label}</span>
                        {step.at ? (
                          <span className="ml-auto text-[10px] text-slate-400">
                            {new Date(step.at).toLocaleTimeString('uz-UZ', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
