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
      className="rounded-xl border border-[#ECECEC] bg-white px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#16A34A]">Jonli yetkazib berish</p>
          <p className="mt-1 text-base font-semibold text-[#111827]">{orderStatusLabelUz(order.status)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280]">
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3.5 w-3.5 text-[#16A34A]" />
              {courier}
            </span>
            {eta ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" />
                {eta}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/client"
          className="flex shrink-0 items-center gap-1 rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white transition active:opacity-90"
        >
          Kuzatish
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
          <div
            className="h-full rounded-full bg-[#16A34A] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-[#9CA3AF]">Buyurtma #{order.id.slice(-6).toUpperCase()}</p>
      </div>
    </motion.section>
  );
}
