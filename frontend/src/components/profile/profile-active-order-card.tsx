'use client';

import { motion } from 'framer-motion';
import { Bike, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import type { LastOrderSnapshot } from '@/lib/last-order-storage';
import {
  isActiveDeliveryStatus,
  orderEtaHintUz,
  orderProgressPercent,
  orderStatusLabelUz,
} from '@/lib/last-order-storage';

type Props = {
  order: LastOrderSnapshot;
};

export function ProfileActiveOrderCard({ order }: Props) {
  if (!isActiveDeliveryStatus(order.status)) return null;

  const pct = orderProgressPercent(order.status);
  const courier = order.courierName ?? 'Kuryer tayinlanmoqda';
  const eta = orderEtaHintUz(order.status);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      id="active-order"
      className="rounded-[20px] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Jonli yetkazib berish</p>
          <p className="mt-1 text-base font-bold text-[#0f172a]">{orderStatusLabelUz(order.status)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3.5 w-3.5 text-emerald-600" />
              {courier}
            </span>
            {eta ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {eta}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/client"
          className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(22,163,74,0.35)] transition active:scale-[0.98]"
        >
          Kuzatish
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Buyurtma #{order.id.slice(-6).toUpperCase()}</p>
      </div>
    </motion.section>
  );
}
