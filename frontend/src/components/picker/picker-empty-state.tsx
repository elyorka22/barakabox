'use client';

import { motion } from 'framer-motion';

type Props = {
  offline?: boolean;
  title?: string;
  subtitle?: string;
};

export function PickerEmptyState({
  offline,
  title = 'Buyurtma yo‘q',
  subtitle = 'Yangi buyurtma kelganda shu yerda ko‘rinadi',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#ECECEC] bg-white px-6 py-12 text-center shadow-sm"
    >
      <p className="text-4xl">{offline ? '📴' : '📦'}</p>
      <p className="mt-3 text-base font-semibold text-[#111827]">{offline ? 'Oflayn rejim' : title}</p>
      <p className="mt-1 text-sm text-[#6B7280]">
        {offline ? 'Internet qaytganida navbat yangilanadi' : subtitle}
      </p>
    </motion.div>
  );
}
