'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { deliveryTypeLabel } from '@/lib/picker-order-utils';
import type { PickerHistoryEntry } from '@/lib/picker-types';

type Props = {
  items: PickerHistoryEntry[];
};

export function PickerHistoryPanel({ items }: Props) {
  const [q, setQ] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  const filtered = useMemo(() => {
    const now = Date.now();
    return items.filter((h) => {
      const t = new Date(h.completedAt).getTime();
      if (dateFilter === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        if (t < d.getTime()) return false;
      }
      if (dateFilter === 'week' && t < now - 7 * 24 * 60 * 60_000) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return h.orderLabel.toLowerCase().includes(s) || h.id.toLowerCase().includes(s);
    });
  }, [items, q, dateFilter]);

  const totalItems = filtered.reduce((a, h) => a + h.itemCount, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#111827]">Xulosa</p>
        <p className="mt-1 text-2xl font-bold text-[#16A34A]">{filtered.length} buyurtma</p>
        <p className="text-xs text-[#6B7280]">{totalItems} ta mahsulot yig‘ilgan</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buyurtma raqami..."
          className="w-full rounded-xl border border-[#ECECEC] bg-white py-2.5 pl-9 pr-3 text-sm outline-none ring-[#16A34A]/30 focus:ring-2"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'today', 'week'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setDateFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${dateFilter === f ? 'bg-[#16A34A] text-white' : 'border border-[#ECECEC] bg-white text-[#6B7280]'}`}
          >
            {f === 'all' ? 'Hammasi' : f === 'today' ? 'Bugun' : 'Hafta'}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {filtered.map((h) => (
          <li key={h.id} className="rounded-2xl border border-[#ECECEC] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold text-[#111827]">#{h.orderLabel}</p>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  h.deliveryType === 'tezkor' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {deliveryTypeLabel(h.deliveryType)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-[#6B7280]">
              <span>{h.itemCount} mahsulot</span>
              <span>
                {h.pickingMinutes} daq ·{' '}
                {new Date(h.completedAt).toLocaleString('uz-UZ', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#9CA3AF]">Tarix bo‘sh</p>
      ) : null}
    </div>
  );
}
