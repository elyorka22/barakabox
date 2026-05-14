'use client';

import Link from 'next/link';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { motion, animate, useMotionValue, type PanInfo } from 'framer-motion';
import { Zap } from 'lucide-react';
import { CartSummary, FreeDeliveryProgressLine } from '@/components/cart-summary';
import type { CartSummaryRow } from '@/components/cart-summary';
import { formatMoneyUz } from '@/lib/format';
import {
  EXPRESS_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
  type DeliverySpeed,
} from '@/lib/delivery-pricing';

/** Total sheet height when collapsed (handle + one-line totals + CTA). */
const COLLAPSED_H = 138;

const VELOCITY_SNAP = 400;

function computeExpandedHeight(): number {
  if (typeof window === 'undefined') return 480;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const nav = 78;
  return Math.min(580, Math.max(300, Math.floor(vh * 0.72) - nav - 12));
}

type CartBottomSheetProps = {
  bottom: string;
  speed: DeliverySpeed;
  onSpeedChange: (s: DeliverySpeed) => void;
  subtotal: number;
  grandTotal: number;
  earnEstimate: number;
  summaryRows: CartSummaryRow[];
  placingOrder: boolean;
  token: string;
  onQuickOrder: () => void;
  checkoutDisabled: boolean;
};

export function CartBottomSheet({
  bottom,
  speed,
  onSpeedChange,
  subtotal,
  grandTotal,
  earnEstimate,
  summaryRows,
  placingOrder,
  token,
  onQuickOrder,
  checkoutDisabled,
}: CartBottomSheetProps) {
  const expandedRef = useRef(computeExpandedHeight());
  const h = useMotionValue(COLLAPSED_H);
  const dragStartH = useRef(COLLAPSED_H);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const relayout = useCallback(() => {
    expandedRef.current = computeExpandedHeight();
    const max = expandedRef.current;
    const cur = h.get();
    if (cur > max) h.set(max);
  }, [h]);

  useLayoutEffect(() => {
    relayout();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', relayout);
    window.addEventListener('resize', relayout);
    return () => {
      vv?.removeEventListener('resize', relayout);
      window.removeEventListener('resize', relayout);
    };
  }, [relayout]);

  const snapTo = useCallback(
    (target: number) => {
      const max = expandedRef.current;
      const clamped = Math.max(COLLAPSED_H, Math.min(max, target));
      setSheetExpanded(clamped > COLLAPSED_H + 20);
      void animate(h, clamped, {
        type: 'spring',
        stiffness: 520,
        damping: 44,
        mass: 0.5,
      });
    },
    [h],
  );

  const onPanStart = useCallback(() => {
    dragStartH.current = h.get();
  }, [h]);

  const onPan = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const max = expandedRef.current;
      const next = Math.max(COLLAPSED_H, Math.min(max, dragStartH.current - info.offset.y));
      h.set(next);
      setSheetExpanded(next > COLLAPSED_H + 22);
    },
    [h],
  );

  const onPanEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      const max = expandedRef.current;
      const cur = h.get();
      const mid = (COLLAPSED_H + max) / 2;
      let target = cur > mid ? max : COLLAPSED_H;
      if (info.velocity.y < -VELOCITY_SNAP) target = max;
      if (info.velocity.y > VELOCITY_SNAP) target = COLLAPSED_H;
      snapTo(target);
    },
    [h, snapTo],
  );

  const standardFeeLabel =
    subtotal >= FREE_DELIVERY_THRESHOLD ? 'Bepul' : formatMoneyUz(STANDARD_DELIVERY_FEE);

  const checkoutHref = speed === 'EXPRESS' ? '/checkout?speed=EXPRESS' : '/checkout';

  return (
    <motion.section
      className="fixed inset-x-0 z-20 flex flex-col overflow-hidden rounded-t-[24px] border border-white/70 bg-white/92 shadow-[0_-16px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl will-change-[height]"
      style={{ bottom, height: h }}
      aria-expanded={sheetExpanded}
    >
      <motion.div
        className="flex shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-1 py-2 active:cursor-grabbing"
        onPanStart={onPanStart}
        onPan={onPan}
        onPanEnd={onPanEnd}
        style={{ touchAction: 'none' }}
        aria-label="Xulosani kengaytirish yoki yig‘ish"
      >
        <span className="h-1 w-10 shrink-0 rounded-full bg-slate-300/90" aria-hidden />
      </motion.div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        <div className="shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Jami</p>
              <p className="mt-0.5 truncate text-[20px] font-extrabold leading-none tabular-nums text-[#121212]">
                {formatMoneyUz(grandTotal)}
              </p>
            </div>
            {earnEstimate > 0 ? (
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800/90">Keshbek</p>
                <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#15803d]">
                  +{formatMoneyUz(earnEstimate)}
                </p>
              </div>
            ) : (
              <div className="h-10 w-10 shrink-0" aria-hidden />
            )}
          </div>

          <Link
            href={checkoutHref}
            scroll={false}
            className={`flex min-h-[46px] w-full items-center justify-center rounded-[15px] text-[15px] font-bold text-white shadow-md transition active:scale-[0.99] ${
              checkoutDisabled ? 'pointer-events-none bg-green-300 shadow-none' : 'bg-[#16A34A] shadow-green-600/25'
            }`}
          >
            Buyurtma berish
          </Link>
        </div>

        <div
          className={
            sheetExpanded
              ? 'mt-2 min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y]'
              : 'h-0 w-full shrink-0 overflow-hidden opacity-0 [pointer-events:none]'
          }
          aria-hidden={!sheetExpanded}
        >
          <div className="space-y-3.5 pb-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tafsilotlar</p>
              <div className="mt-1.5">
                <CartSummary rows={summaryRows} />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Yetkazish sharti</p>
              <div className="mt-1.5">
                <FreeDeliveryProgressLine
                  subtotal={subtotal}
                  threshold={FREE_DELIVERY_THRESHOLD}
                  speed={speed}
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Yetkazish turi</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSpeedChange('EXPRESS')}
                  className={`flex min-h-[3.25rem] flex-col items-start rounded-[14px] border px-2.5 py-1.5 text-left transition active:scale-[0.99] ${
                    speed === 'EXPRESS'
                      ? 'border-[#16A34A] bg-green-50 ring-2 ring-[#16A34A]/20'
                      : 'border-slate-200 bg-slate-50/90'
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#121212]">
                    <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                    Tezkor
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">15–30 daq</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-[#15803d]">{formatMoneyUz(EXPRESS_DELIVERY_FEE)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSpeedChange('STANDARD')}
                  className={`flex min-h-[3.25rem] flex-col items-start rounded-[14px] border px-2.5 py-1.5 text-left transition active:scale-[0.99] ${
                    speed === 'STANDARD'
                      ? 'border-[#16A34A] bg-green-50 ring-2 ring-[#16A34A]/20'
                      : 'border-slate-200 bg-slate-50/90'
                  }`}
                >
                  <span className="text-[11px] font-bold text-[#121212]">Oddiy</span>
                  <span className="text-[10px] font-medium text-slate-500">1–2 soat</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-slate-600">{standardFeeLabel}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="flex min-h-[44px] w-full items-center justify-center rounded-[14px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition active:scale-[0.99] disabled:opacity-50"
              onClick={onQuickOrder}
              disabled={placingOrder || subtotal <= 0 || !token}
            >
              {placingOrder ? 'Jarayon…' : token ? 'Tezkor buyurtma' : 'Tezkor buyurtma (tizimga kiring)'}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
