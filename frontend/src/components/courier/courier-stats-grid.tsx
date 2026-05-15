'use client';

import { motion } from 'framer-motion';
import { Bike, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import { formatOnlineDuration } from '@/lib/courier-storage';
import type { CourierPeriodStats } from '@/lib/courier-types';

type Props = {
  period: CourierPeriodStats;
  workedSeconds?: number;
};

export function CourierStatsGrid({ period, workedSeconds }: Props) {
  const cards = [
    { icon: Bike, label: 'Yetkazishlar', value: String(period.deliveries) },
    { icon: Wallet, label: 'Daromad', value: formatMoneyUz(period.earningsSoM) },
    { icon: CheckCircle2, label: 'Yakunlangan', value: String(period.deliveries) },
    {
      icon: Clock,
      label: 'Onlayn',
      value: workedSeconds != null ? formatOnlineDuration(workedSeconds) : '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl border border-[#ECECEC] bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0FDF4]">
              <Icon className="h-4 w-4 text-[#16A34A]" strokeWidth={2} />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{card.label}</p>
            <p className="mt-0.5 text-base font-bold tabular-nums text-[#111827] dark:text-white">{card.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
