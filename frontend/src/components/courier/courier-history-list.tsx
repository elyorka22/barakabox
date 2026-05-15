'use client';

import { useMemo, useState } from 'react';
import { formatMoneyUz } from '@/lib/format';
import type { CourierHistoryEntry } from '@/lib/courier-types';

const PAGE = 12;

function HistoryRow({ item }: { item: CourierHistoryEntry }) {
  return (
    <div className="rounded-2xl border border-[#ECECEC] bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-[#111827] dark:text-white">{item.customerName}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-[#6B7280]">{item.deliveryAddress}</p>
      
      <div className="mt-2 flex justify-between text-xs">
        <span className="font-semibold text-[#16A34A]">{formatMoneyUz(item.totalAmount)}</span>
        <span className="text-[#9CA3AF]">
          {new Date(item.deliveredAt).toLocaleString('uz-UZ', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export function CourierHistoryList({ items }: { items: CourierHistoryEntry[] }) {
  const [page, setPage] = useState(1);
  const visible = useMemo(() => items.slice(0, page * PAGE), [items, page]);

  return (
    <div className="space-y-2">
      {visible.map((h) => (
        <HistoryRow key={h.id} item={h} />
      ))}
      {visible.length < items.length ? (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="w-full rounded-xl border border-[#ECECEC] py-2.5 text-sm font-medium text-[#374151]"
        >
          Ko‘proq ko‘rsatish
        </button>
      ) : null}
    </div>
  );
}
