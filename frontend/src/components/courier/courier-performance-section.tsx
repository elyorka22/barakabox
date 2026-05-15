'use client';

import { motion } from 'framer-motion';
import { Award, CheckCircle2, Clock, Star, Zap } from 'lucide-react';
import type { CourierStatsResponse } from '@/lib/courier-types';

export function CourierPerformanceSection({ performance }: { performance: CourierStatsResponse['performance'] }) {
  const items = [
    { icon: CheckCircle2, label: 'Qabul foizi', value: `${performance.acceptanceRate}%` },
    { icon: Award, label: 'Yakunlash', value: `${performance.completionRate}%` },
    { icon: Clock, label: 'O‘rtacha yetkazish', value: `${performance.avgDeliveryMinutes} daq` },
    { icon: Star, label: 'Reyting', value: performance.rating.toFixed(1) },
    { icon: Zap, label: 'Streak', value: `${performance.activeStreakDays} kun` },
  ];

  return (
    <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#111827]">Samaradorlik</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-[#F3F4F6] bg-[#FAFAFA] px-3 py-2.5"
            >
              <Icon className="h-4 w-4 text-[#16A34A]" strokeWidth={2} />
              <p className="mt-1 text-[10px] text-[#9CA3AF]">{item.label}</p>
              <p className="text-sm font-bold text-[#111827]">{item.value}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
