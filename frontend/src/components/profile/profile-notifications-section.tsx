'use client';

import { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, Package, Percent, Radio, Truck } from 'lucide-react';
import type { ProfileNotifCounts } from '@/lib/profile-notifications-storage';

type Row = {
  key: keyof ProfileNotifCounts;
  label: string;
  sub: string;
  icon: typeof Package;
};

const ROWS: Row[] = [
  { key: 'orders', label: 'Buyurtmalar', sub: 'Status va chek', icon: Package },
  { key: 'promotions', label: 'Aksiyalar', sub: 'Chegirma va super narxl', icon: Percent },
  { key: 'delivery', label: 'Yetkazib berish', sub: 'Kuryer va vaqt', icon: Truck },
  { key: 'cashback', label: 'Cashback', sub: 'Bonus va to‘lovlar', icon: Radio },
];

type Props = {
  counts: ProfileNotifCounts;
};

export function ProfileNotificationsSection({ counts }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <section id="notifications" className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-[#ECECEC] px-4 py-3 text-left transition active:bg-[#FAFAFA]"
      >
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-[#6B7280]" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-[#111827]">Bildirishnomalar</p>
            <p className="text-xs text-[#6B7280]">Bo‘limlar bo‘yicha</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[#9CA3AF]" /> : <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />}
      </button>
      {open ? (
        <ul className="divide-y divide-[#ECECEC]">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const n = counts[row.key];
            return (
              <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-3 transition active:bg-[#FAFAFA]">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111827]">{row.label}</p>
                    <p className="text-[11px] text-[#6B7280]">{row.sub}</p>
                  </div>
                </div>
                {n > 0 ? (
                  <span className="shrink-0 rounded-full border border-[#DCFCE7] bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
                    {n > 9 ? '9+' : n}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-[#D1D5DB]">—</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
