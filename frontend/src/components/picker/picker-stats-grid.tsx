'use client';

import { motion } from 'framer-motion';
import { Clock, Package, Timer, Zap } from 'lucide-react';
import { formatPickerDuration } from '@/lib/picker-storage';

type Props = {
  queued: number;
  pickedToday: number;
  avgPickMinutes: number;
  onlineSeconds: number;
};

export function PickerStatsGrid({ queued, pickedToday, avgPickMinutes, onlineSeconds }: Props) {
  const cards = [
    { icon: Package, label: 'Navbatda', value: String(queued) },
    { icon: Zap, label: 'Bugun yig‘ilgan', value: String(pickedToday) },
    { icon: Timer, label: 'O‘rtacha vaqt', value: avgPickMinutes ? `${avgPickMinutes} daq` : '—' },
    { icon: Clock, label: 'Aktiv vaqt', value: formatPickerDuration(onlineSeconds) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-[#ECECEC] bg-white p-3 shadow-sm"
          >
            <Icon className="h-4 w-4 text-[#16A34A]" strokeWidth={2} />
            <p className="mt-2 text-[10px] font-medium text-[#9CA3AF]">{c.label}</p>
            <p className="text-lg font-bold text-[#111827]">{c.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
