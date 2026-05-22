'use client';

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Clock, Package, Timer, Truck } from 'lucide-react';
import type { PickerOrder } from '@/lib/picker-types';
import {
  estimatePickMinutes,
  formatOrderTime,
  formatScheduledCountdown,
  pickerOrderLabel,
  pickerOrderLabelFormatted,
  isScheduledOrder,
  minutesSinceCreated,
  msUntilScheduled,
  orderDeliveryFeeLabel,
  statusLabelUz,
} from '@/lib/picker-order-utils';
import { readChecklist, writeChecklist, recordPickerNotFoundItem } from '@/lib/picker-storage';
import { PickerProductChecklist } from './picker-product-checklist';
import { showToast } from '@/lib/toast';

type Props = {
  order: PickerOrder;
  busy?: boolean;
  onStart: () => Promise<void>;
  onReady: () => Promise<void>;
};

function PickerQueueCard({
  order,
  busy,
  onStart,
}: {
  order: PickerOrder;
  busy?: boolean;
  onStart: () => Promise<void>;
}) {
  const scheduled = isScheduledOrder(order);
  const deliveryLabel = orderDeliveryFeeLabel(order);
  const labelFormatted = pickerOrderLabelFormatted(order);
  const [countdown, setCountdown] = useState(() =>
    formatScheduledCountdown(msUntilScheduled(order)),
  );

  useEffect(() => {
    if (!scheduled) return;
    const tick = () => setCountdown(formatScheduledCountdown(msUntilScheduled(order)));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [order.id, order.scheduledAt, scheduled]);

  return (
    <>
      <div
        className={`flex items-stretch justify-between gap-3 px-4 py-3.5 text-white ${
          scheduled ? 'bg-violet-900' : 'bg-[#111827]'
        }`}
      >
        <div className="min-w-0">
          <p className="font-mono text-2xl font-bold leading-none tracking-widest">{labelFormatted}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/60">
            Ichki raqam
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {scheduled ? (
            <span className="rounded-lg bg-violet-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Rejalashtirilgan
            </span>
          ) : null}
          <span
            className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide ${
              scheduled ? 'bg-white/15 text-white' : 'bg-amber-400 text-amber-950'
            }`}
          >
            {statusLabelUz(order.status)}
          </span>
        </div>
      </div>

      <div className="px-4 py-3.5">
        {scheduled ? (
          <div className="mb-3 space-y-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-900">
                <CalendarClock className="h-4 w-4" strokeWidth={2} />
                {order.deliverySlotLabel ?? 'Yetkazish vaqti'}
              </span>
              <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
                {countdown}
              </span>
            </div>
            <p className="text-[11px] font-medium text-violet-800">Qolgan vaqt</p>
          </div>
        ) : null}

        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
          <Truck className="h-4 w-4" strokeWidth={2} />
          {deliveryLabel}
        </span>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-2.5 text-center">
            <Package className="mx-auto h-4 w-4 text-[#16A34A]" />
            <p className="mt-1 text-lg font-bold tabular-nums text-[#111827]">{order.items.length}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Mahsulot</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-2.5 text-center">
            <Timer className="mx-auto h-4 w-4 text-[#16A34A]" />
            <p className="mt-1 text-lg font-bold tabular-nums text-[#111827]">~{estimatePickMinutes(order)}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Daq (taxmin)</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-2.5 text-center">
            <Clock className="mx-auto h-4 w-4 text-[#16A34A]" />
            <p className="mt-1 text-lg font-bold tabular-nums text-[#111827]">
              {scheduled ? countdown.split(' ')[0] ?? '—' : minutesSinceCreated(order.createdAt)}
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              {scheduled ? 'Qolgan' : 'Daq oldin'}
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] font-medium text-[#9CA3AF]">
          {formatOrderTime(order.scheduledAt ?? order.createdAt)}
        </p>
      </div>

      <div className="border-t border-[#ECECEC] bg-[#FAFAFA] p-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onStart()}
          className="min-h-[52px] w-full rounded-xl bg-[#16A34A] text-sm font-bold uppercase tracking-wide text-white shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {scheduled ? 'Yig‘ishni boshlash' : 'Qabul qilish'}
        </button>
      </div>
    </>
  );
}

function PickerOrderCardInner({ order, busy, onStart, onReady }: Props) {
  const isQueue = order.status === 'NEW' || order.status === 'PENDING_SCHEDULE';
  const isPicking = order.status === 'PICKING';
  const deliveryLabel = orderDeliveryFeeLabel(order);
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

  const handleReady = async () => {
    const allDone = order.items.every(
      (i) => checklist.checkedIds.includes(i.id) || checklist.notFoundIds.includes(i.id),
    );
    if (!allDone && !window.confirm('Barcha mahsulotlar belgilanmagan. Davom etasizmi?')) return;
    await onReady();
  };

  return (
    <motion.li
      layout={false}
      initial={false}
      className={`overflow-hidden rounded-2xl bg-white shadow-sm [content-visibility:auto] [contain-intrinsic-size:300px] ${
        isQueue ? (isScheduledOrder(order) ? 'border-2 border-violet-300/60' : 'border-2 border-[#111827]/10') : 'border border-[#ECECEC]'
      }`}
    >
      {isQueue ? <PickerQueueCard order={order} busy={busy} onStart={onStart} /> : null}

      {isPicking ? (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-[#ECECEC] bg-[#F8FAFC] px-3 py-2.5">
            <p className="font-mono text-sm font-bold text-[#111827]">{pickerOrderLabelFormatted(order)}</p>
            <div className="flex items-center gap-2">
              {isScheduledOrder(order) ? (
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                  Reja
                </span>
              ) : null}
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {deliveryLabel}
              </span>
              <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#166534]">
                {statusLabelUz(order.status)}
              </span>
            </div>
          </div>

          <div className="px-3 py-3">
            <PickerProductChecklist
              items={order.items}
              checkedIds={checklist.checkedIds}
              notFoundIds={checklist.notFoundIds}
              onToggle={toggleItem}
              onNotFound={markNotFound}
            />
          </div>

          <div className="border-t border-[#ECECEC] p-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReady()}
              className="min-h-12 w-full rounded-2xl bg-[#111827] text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
            >
              Tayyor deb belgilash
            </button>
          </div>
        </>
      ) : null}
    </motion.li>
  );
}

function orderCardPropsEqual(prev: Props, next: Props): boolean {
  if (prev.busy !== next.busy) return false;
  const a = prev.order;
  const b = next.order;
  if (a.id !== b.id || a.status !== b.status) return false;
  if ((a.scheduledAt ?? '') !== (b.scheduledAt ?? '')) return false;
  if (a.items.length !== b.items.length) return false;
  return true;
}

export const PickerOrderCard = memo(PickerOrderCardInner, orderCardPropsEqual);
