'use client';

import { motion } from 'framer-motion';
import type { PickerHistoryEntry } from '@/lib/picker-types';
import type { PickerDayStats } from '@/lib/picker-types';
import { formatPickerDuration } from '@/lib/picker-storage';

type Props = {
  stats: PickerDayStats;
  history: PickerHistoryEntry[];
  weekPicked: number;
  peakHour: string;
};

export function PickerStatsPanel({ stats, history, weekPicked, peakHour }: Props) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const count = history.filter((h) => h.completedAt.slice(0, 10) === key).length;
    return { label: d.toLocaleDateString('uz-UZ', { weekday: 'short' }), count };
  });
  const maxBar = Math.max(1, ...last7.map((d) => d.count));

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#111827]">Kunlik ko‘rsatkichlar</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[#F0FDF4] p-3">
            <p className="text-[10px] text-[#6B7280]">Bugun</p>
            <p className="text-xl font-bold text-[#16A34A]">{stats.pickedToday}</p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <p className="text-[10px] text-[#6B7280]">O‘rtacha tezlik</p>
            <p className="text-xl font-bold">{stats.avgPickMinutes || '—'} daq</p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <p className="text-[10px] text-[#6B7280]">Topilmagan</p>
            <p className="text-xl font-bold text-rose-600">{stats.cancelledItems}</p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <p className="text-[10px] text-[#6B7280]">Ish vaqti</p>
            <p className="text-lg font-bold">{formatPickerDuration(stats.onlineSeconds)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#111827]">Haftalik diagramma</p>
        <p className="text-xs text-[#9CA3AF]">{weekPicked} buyurtma (7 kun)</p>
        <div className="mt-4 flex items-end justify-between gap-1 h-28">
          {last7.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / maxBar) * 100}%` }}
              transition={{ delay: i * 0.05 }}
              className="flex min-h-[4px] flex-1 flex-col justify-end"
            >
              <div className="w-full rounded-t-md bg-[#16A34A]" style={{ height: `${Math.max(8, (d.count / maxBar) * 100)}%` }} />
              <span className="mt-1 text-center text-[9px] text-[#9CA3AF]">{d.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#111827]">Mahsuldorlik</p>
        <ul className="mt-2 space-y-2 text-sm text-[#374151]">
          <li className="flex justify-between">
            <span>Pik cho‘qqisi</span>
            <span className="font-semibold">{peakHour}</span>
          </li>
          <li className="flex justify-between">
            <span>Haftalik o‘rtacha</span>
            <span className="font-semibold">{Math.round(weekPicked / 7)} / kun</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
