'use client';

import { motion } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import { formatOnlineDuration } from '@/lib/courier-storage';
import type { CourierStatsResponse } from '@/lib/courier-types';

type Props = {
  shift: CourierStatsResponse['shift'];
  busy?: boolean;
  onStart: () => void;
  onEnd: () => void;
};

export function CourierShiftPanel({ shift, busy, onStart, onEnd }: Props) {
  return (
    <section className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Smena</p>
          <p className="text-xs text-[#6B7280]">
            {shift.active ? 'Faol smena' : 'Smena boshlanmagan'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
            shift.active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F3F4F6] text-[#6B7280]'
          }`}
        >
          {shift.active ? 'LIVE' : 'OFF'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-[#FAFAFA] px-3 py-2">
          <p className="text-[#9CA3AF]">Bugun ishlangan</p>
          <p className="font-bold text-[#111827]">{formatOnlineDuration(shift.workedSecondsToday)}</p>
        </div>
        <div className="rounded-xl bg-[#F0FDF4] px-3 py-2">
          <p className="text-[#9CA3AF]">Smena daromadi</p>
          <p className="font-bold text-[#166534]">{formatMoneyUz(shift.shiftEarningsSoM)}</p>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        disabled={busy}
        onClick={shift.active ? onEnd : onStart}
        className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white disabled:opacity-60 ${
          shift.active ? 'bg-slate-800' : 'bg-[#16A34A]'
        }`}
      >
        {shift.active ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {shift.active ? 'Smenani tugatish' : 'Smenani boshlash'}
      </motion.button>
    </section>
  );
}
