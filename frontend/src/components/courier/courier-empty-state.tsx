'use client';

import { motion } from 'framer-motion';

export function CourierEmptyState({ offline }: { offline?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center"
    >
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-4xl"
        aria-hidden
      >
        📦
      </motion.span>
      <p className="mt-3 text-base font-semibold text-[#111827]">Hozircha buyurtmalar yo‘q</p>
      <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-[#6B7280]">
        {offline
          ? 'Onlayn rejimga o‘ting — yangi buyurtmalar shu yerda paydo bo‘ladi.'
          : 'Tayyor buyurtmalar paydo bo‘lganda bildirishnoma olasiz.'}
      </p>
    </motion.div>
  );
}
