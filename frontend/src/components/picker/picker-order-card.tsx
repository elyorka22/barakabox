'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package, Timer, Truck } from 'lucide-react';
import type { PickerOrder } from '@/lib/picker-types';
import {
  estimatePickMinutes,
  formatOrderTime,
  internalOrderLabel,
  minutesSinceCreated,
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
  const deliveryLabel = orderDeliveryFeeLabel(order);
  const label = internalOrderLabel(order.id);

  return (
    <>
      <div className="flex items-stretch justify-between gap-3 bg-[#111827] px-4 py-3.5 text-white">
        <div className="min-w-0">
          <p className="font-mono text-2xl font-bold leading-none tracking-widest">{label}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">Ichki raqam</p>
        </div>
        <span className="flex shrink-0 items-center self-center rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-950">
          {statusLabelUz(order.status)}
        </span>
      </div>

      <div className="px-4 py-3.5">
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
            <p className="mt-1 text-lg font-bold tabular-nums text-[#111827]">{minutesSinceCreated(order.createdAt)}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Daq oldin</p>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] font-medium text-[#9CA3AF]">{formatOrderTime(order.createdAt)}</p>
      </div>

      <div className="border-t border-[#ECECEC] bg-[#FAFAFA] p-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onStart()}
          className="min-h-[52px] w-full rounded-xl bg-[#16A34A] text-sm font-bold uppercase tracking-wide text-white shadow-md disabled:opacity-60"
        >
          Qabul qilish
        </button>
      </div>
    </>
  );
}

function PickerOrderCardInner({ order, busy, onStart, onReady }: Props) {
  const isNew = order.status === 'NEW';
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
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ${
        isNew ? 'border-2 border-[#111827]/10' : 'border border-[#ECECEC]'
      }`}
    >
      {isNew ? <PickerQueueCard order={order} busy={busy} onStart={onStart} /> : null}

      {isPicking ? (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-[#ECECEC] bg-[#F8FAFC] px-3 py-2.5">
            <p className="font-mono text-sm font-bold text-[#111827]">#{internalOrderLabel(order.id)}</p>
            <div className="flex items-center gap-2">
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
              className="min-h-12 w-full rounded-2xl bg-[#111827] text-sm font-bold text-white disabled:opacity-60"
            >
              Tayyor deb belgilash
            </button>
          </div>
        </>
      ) : null}
    </motion.li>
  );
}

export const PickerOrderCard = memo(PickerOrderCardInner);
