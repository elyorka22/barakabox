'use client';

import { motion } from 'framer-motion';

type Props = {
  name: string;
  online: boolean;
};

export function CourierHero({ name, online }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-[#16A34A] via-[#22C55E] to-[#15803D] px-4 py-3 text-white shadow-md"
    >
      <p className="text-xs font-medium text-emerald-100">Salom</p>
      <p className="text-lg font-bold tracking-tight">{name}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-50">
        <span className={`h-2 w-2 rounded-full ${online ? 'bg-white animate-pulse' : 'bg-emerald-200'}`} />
        {online ? 'Navbatda — yangi buyurtmalarni kuting' : 'Oflayn rejim'}
      </p>
    </motion.div>
  );
}
