'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, MessageSquare, Phone, X } from 'lucide-react';
import { formatMoneyUz } from '@/lib/format';
import type { PickerOrder } from '@/lib/picker-types';
import {
  estimatePickMinutes,
  formatOrderTime,
  minutesSinceCreated,
  orderPriority,
  paymentTypeLabel,
  statusLabelUz,
} from '@/lib/picker-order-utils';
import {
  readChecklist,
  writeChecklist,
  addSkippedOrderId,
  recordPickerNotFoundItem,
} from '@/lib/picker-storage';
import { PickerProductChecklist } from './picker-product-checklist';
import { showToast } from '@/lib/toast';

type Props = {
  order: PickerOrder;
  busy?: boolean;
  onStart: () => Promise<void>;
  onReady: () => Promise<void>;
  onSkip: () => void;
};

function PickerOrderCardInner({ order, busy, onStart, onReady, onSkip }: Props) {
  const isNew = order.status === 'NEW';
  const isPicking = order.status === 'PICKING';
  const priority = orderPriority(order);
  const address = order.formattedAddress || order.deliveryAddress || '—';
  const [checklist, setChecklist] = useState(() => readChecklist(order.id));

  const toggleItem = (itemId: string) => {
    const checked = checklist.checkedIds.includes(itemId)
      ? checklist.checkedIds.filter((id) => id !== itemId)
      : [...checklist.checkedIds, itemId];
    const next = { ...checklist, checkedIds: checked };
    setChecklist(next);
    writeChecklist(order.id, next);
  };

  const markNotFound = (itemId: string) => {
    const notFoundIds = checklist.notFoundIds.includes(itemId)
      ? checklist.notFoundIds
      : [...checklist.notFoundIds, itemId];
    const next = { checkedIds: checklist.checkedIds.filter((id) => id !== itemId), notFoundIds };
    setChecklist(next);
    writeChecklist(order.id, next);
    recordPickerNotFoundItem();
    showToast({ type: 'info', message: 'Mahsulot topilmadi deb belgilandi' });
  };

  const handleSkip = () => {
    if (!window.confirm('Buyurtmani navbatdan olib tashlaysizmi? (Admin bekor qilishi kerak bo‘lishi mumkin)')) return;
    addSkippedOrderId(order.id);
    onSkip();
    showToast({ type: 'info', message: 'Buyurtma yashirildi' });
  };

  const handleReady = async () => {
    const allDone = order.items.every(
      (i) => checklist.checkedIds.includes(i.id) || checklist.notFoundIds.includes(i.id),
    );
    if (!allDone && !window.confirm('Barcha mahsulotlar belgilanmagan. Davom etasizmi?')) return;
    await onReady();
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#F3F4F6] bg-[#FAFAFA] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                priority === 'shoshilinch' ? 'bg-rose-100 text-rose-800' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              {priority === 'shoshilinch' ? 'Shoshilinch' : 'Oddiy'}
            </span>
            <span className="text-xs font-medium text-[#9CA3AF]">#{order.id.slice(-8).toUpperCase()}</span>
          </div>
          <p className="mt-1 text-base font-bold text-[#111827]">{order.customerName || 'Mijoz'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
          {statusLabelUz(order.status)}
        </span>
      </div>

      <div className="space-y-2 px-4 py-3 text-sm">
        <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 font-semibold text-[#16A34A]">
          <Phone className="h-4 w-4" />
          {order.customerPhone}
        </a>
        <p className="flex items-start gap-2 text-[#374151]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
          <span className="leading-snug">{address}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-[#F0FDF4] px-2 py-1 font-semibold text-[#166534]">
            {formatMoneyUz(order.totalAmount)}
          </span>
          <span className="rounded-lg bg-[#F3F4F6] px-2 py-1 font-medium">{order.items.length} mahsulot</span>
          <span className="rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
            ~{estimatePickMinutes(order)} daq
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-[#ECECEC] px-2 py-1 text-[#6B7280]">
            <Clock className="h-3 w-3" />
            {minutesSinceCreated(order.createdAt)} daq oldin
          </span>
          <span className="rounded-lg border border-[#ECECEC] px-2 py-1 text-[#6B7280]">{paymentTypeLabel()}</span>
        </div>
        <p className="text-[11px] text-[#9CA3AF]">{formatOrderTime(order.createdAt)}</p>
        {order.deliveryNote ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#FFFBEB] px-3 py-2 text-xs text-amber-950">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {order.deliveryNote}
          </p>
        ) : null}
      </div>

      {isPicking ? (
        <div className="border-t border-[#F3F4F6] px-3 py-3">
          <PickerProductChecklist
            items={order.items}
            checkedIds={checklist.checkedIds}
            notFoundIds={checklist.notFoundIds}
            onToggle={toggleItem}
            onNotFound={markNotFound}
          />
        </div>
      ) : null}

      <div className="grid gap-2 border-t border-[#F3F4F6] p-3">
        {isNew ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSkip()}
              className="flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] text-sm font-bold text-[#B91C1C] disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onStart()}
              className="min-h-12 rounded-2xl bg-[#16A34A] text-sm font-bold text-white shadow-md disabled:opacity-60"
            >
              Qabul qilish
            </button>
          </div>
        ) : null}
        {isPicking ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReady()}
            className="min-h-12 rounded-2xl bg-[#111827] text-sm font-bold text-white disabled:opacity-60"
          >
            Tayyor deb belgilash
          </button>
        ) : null}
      </div>
    </motion.li>
  );
}

export const PickerOrderCard = memo(PickerOrderCardInner);
