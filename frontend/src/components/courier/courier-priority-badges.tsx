'use client';

import { motion } from 'framer-motion';
import type { OrderPriority } from '@/lib/courier-types';

const CONFIG: Record<OrderPriority, { label: string; className: string }> = {
  HOT: { label: 'HOT', className: 'bg-rose-500 text-white' },
  DELAYED: { label: 'Kechikkan', className: 'bg-amber-500 text-white' },
  VIP: { label: 'VIP', className: 'bg-violet-600 text-white' },
  LONG_DISTANCE: { label: 'Uzoq', className: 'bg-slate-700 text-white' },
};

export function CourierPriorityBadges({ priorities }: { priorities?: OrderPriority[] }) {
  if (!priorities?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {priorities.map((p) => (
        <motion.span
          key={p}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CONFIG[p].className} ${
            p === 'HOT' ? 'animate-pulse' : ''
          }`}
        >
          {CONFIG[p].label}
        </motion.span>
      ))}
    </div>
  );
}
