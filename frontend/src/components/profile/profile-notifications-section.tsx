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
    <section id="notifications" className="rounded-[20px] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left transition active:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <Bell className="h-4 w-4 text-slate-700" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Bildirishnomalar</p>
            <p className="text-xs text-slate-500">Bo‘limlar bo‘yicha</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open ? (
        <div className="space-y-1 px-2 pb-2">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const n = counts[row.key];
            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 rounded-2xl px-2 py-2.5 transition active:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111827]">{row.label}</p>
                    <p className="text-[11px] text-slate-500">{row.sub}</p>
                  </div>
                </div>
                {n > 0 ? (
                  <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {n > 9 ? '9+' : n}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">—</span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
