'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, MessageSquare, Navigation, Phone, X } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import {
  estimateDistanceKm,
  estimateEtaMinutes,
  formatOrderTime,
  googleMapsHref,
  orderStatusLabelUz,
  paymentTypeLabel,
  staticMapPreviewUrl,
  yandexMapsHref,
} from '@/lib/courier-order-utils';
import type { CourierOrder } from '@/lib/courier-types';
import { CourierPriorityBadges } from './courier-priority-badges';

type Props = {
  order: CourierOrder;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onComplete: () => void;
};

function CourierOrderCardInner({ order, busy, onAccept, onReject, onComplete }: Props) {
  const isReady = order.status === 'READY';
  const isDelivering = order.status === 'DELIVERING';
  const distance = estimateDistanceKm(order);
  const eta = estimateEtaMinutes(order);
  const gmaps = googleMapsHref(order);
  const ymaps = yandexMapsHref(order);
  const preview = staticMapPreviewUrl(order);
  const address = order.formattedAddress || order.deliveryAddress || 'Manzil ko‘rsatilmagan';

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.995 }}
      className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#F3F4F6] bg-[#FAFAFA] px-4 py-3 dark:bg-slate-800/50">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-[#111827] dark:text-white">{order.customerName || 'Mijoz'}</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">#{order.id.slice(-8).toUpperCase()}</p>
          <div className="mt-2">
            <CourierPriorityBadges priorities={order.priorities} />
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isReady ? 'bg-amber-100 text-amber-900' : 'bg-[#DCFCE7] text-[#166534]'
          }`}
        >
          {orderStatusLabelUz(order.status)}
        </span>
      </div>

      {preview && gmaps ? (
        <a href={gmaps} target="_blank" rel="noopener noreferrer" className="block border-b border-[#F3F4F6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-[88px] w-full object-cover" loading="lazy" />
        </a>
      ) : null}

      <div className="space-y-2.5 px-4 py-3 text-sm">
        <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 font-semibold text-[#16A34A]">
          <Phone className="h-4 w-4 shrink-0" />
          {order.customerPhone}
        </a>
        <p className="flex items-start gap-2 text-[#374151] dark:text-slate-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
          <span className="leading-snug">
            {order.addressLabel ? (
              <span className="mb-0.5 block text-xs font-medium text-amber-800">{order.addressLabel}</span>
            ) : null}
            {address}
          </span>
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {distance != null ? (
            <span className="rounded-lg bg-[#F3F4F6] px-2 py-1 font-medium">~{distance} km</span>
          ) : null}
          {eta != null ? (
            <span className="rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-800">ETA ~{eta} daq</span>
          ) : null}
          <span className="rounded-lg bg-[#F0FDF4] px-2 py-1 font-semibold text-[#166534]">
            {formatMoneyUz(order.totalAmount)}
          </span>
          <span className="rounded-lg border border-[#ECECEC] px-2 py-1 text-[#6B7280]">{paymentTypeLabel()}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F9FAFB] px-2 py-1 text-[#6B7280]">
            <Clock className="h-3 w-3" />
            {formatOrderTime(order.createdAt)}
          </span>
        </div>
        {order.deliveryNote ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#FFFBEB] px-3 py-2 text-xs text-amber-950">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {order.deliveryNote}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 border-t border-[#F3F4F6] bg-white p-3 dark:bg-slate-900">
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`tel:${order.customerPhone}`}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#ECECEC] text-xs font-semibold active:bg-[#F9FAFB]"
          >
            <Phone className="h-4 w-4" />
            Qo‘ng‘iroq
          </a>
          {gmaps ? (
            <a
              href={gmaps}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#111827] text-xs font-semibold text-white"
            >
              <Navigation className="h-4 w-4" />
              Google
            </a>
          ) : null}
          {ymaps ? (
            <a
              href={ymaps}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#FC3F1D] text-xs font-semibold text-white"
            >
              Yandex
            </a>
          ) : null}
        </div>
        {isReady ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] text-sm font-bold text-[#B91C1C] disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Rad etish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAccept}
              className="min-h-12 rounded-2xl bg-[#16A34A] text-sm font-bold text-white shadow-md disabled:opacity-60"
            >
              Qabul qilish
            </button>
          </div>
        ) : null}
        {isDelivering ? (
          <button
            type="button"
            disabled={busy}
            onClick={onComplete}
            className="min-h-12 rounded-2xl bg-[#111827] text-sm font-bold text-white disabled:opacity-60"
          >
            Yetkazildi
          </button>
        ) : null}
      </div>
    </motion.li>
  );
}

export const CourierOrderCard = memo(CourierOrderCardInner);
