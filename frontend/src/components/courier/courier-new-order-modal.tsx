'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, X } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import type { CourierOrder } from '@/lib/courier-types';
import { estimateDistanceKm, estimateEtaMinutes, formatOrderTime } from '@/lib/courier-order-utils';
import { CourierPriorityBadges } from './courier-priority-badges';

type Props = {
  order: CourierOrder | null;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
};

export function CourierNewOrderModal({ order, busy, onAccept, onReject, onClose }: Props) {
  useEffect(() => {
    if (!order) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [order]);

  const distance = order ? estimateDistanceKm(order) : null;
  const eta = order ? estimateEtaMinutes(order) : null;

  return (
    <AnimatePresence>
      {order ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="bg-gradient-to-br from-[#16A34A] to-[#15803D] px-5 py-4 text-white">

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">Yangi buyurtma</p>
                  <p className="mt-1 text-xl font-bold">{order.customerName}</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-full bg-white/20 p-1.5" aria-label="Yopish">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2">
                <CourierPriorityBadges priorities={order.priorities} />
              </div>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-[#16A34A]">
                <Phone className="h-4 w-4" />
                {order.customerPhone}
              </p>
              <p className="flex items-start gap-2 text-[#374151]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                {order.formattedAddress || order.deliveryAddress}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-[#F0FDF4] px-2 py-1 font-bold text-[#166534]">
                  {formatMoneyUz(order.totalAmount)}
                </span>
                {distance != null ? (
                  <span className="rounded-lg bg-[#F3F4F6] px-2 py-1">~{distance} km</span>
                ) : null}
                {eta != null ? <span className="rounded-lg bg-[#F3F4F6] px-2 py-1">~{eta} daq</span> : null}
                <span className="rounded-lg bg-[#F9FAFB] px-2 py-1 text-[#6B7280]">
                  {formatOrderTime(order.createdAt)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[#F3F4F6] p-4">
              <button
                type="button"
                disabled={busy}
                onClick={onReject}
                className="min-h-14 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] text-sm font-bold text-rose-700 disabled:opacity-60"
              >
                Rad etish
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onAccept}
                className="min-h-14 rounded-2xl bg-[#16A34A] text-sm font-bold text-white shadow-lg disabled:opacity-60"
              >
                Qabul qilish
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
