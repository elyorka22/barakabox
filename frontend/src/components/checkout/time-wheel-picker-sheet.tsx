'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const ITEM_H = 52;
const VISIBLE_COUNT = 5;
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2);

type Props = {
  open: boolean;
  title?: string;
  times: string[];
  value: string;
  onClose: () => void;
  onConfirm: (timeHm: string) => void;
};

function getCenteredIndex(scrollEl: HTMLDivElement, itemCount: number): number {
  if (itemCount <= 0) return 0;
  const centerY = scrollEl.scrollTop + scrollEl.clientHeight / 2;
  const raw = Math.round((centerY - PAD_COUNT * ITEM_H - ITEM_H / 2) / ITEM_H);
  return Math.min(itemCount - 1, Math.max(0, raw));
}

function scrollToIndex(scrollEl: HTMLDivElement, index: number, smooth: boolean) {
  const top = index * ITEM_H;
  scrollEl.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

function TimeWheelPickerSheetInner({
  open,
  title = 'Yetkazish vaqtini tanlang',
  times,
  value,
  onClose,
  onConfirm,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const programmaticScroll = useRef(false);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [centeredIndex, setCenteredIndex] = useState(0);

  const activeTime = times[centeredIndex] ?? '';

  const applyIndexFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || times.length === 0) return;
    const idx = getCenteredIndex(el, times.length);
    setCenteredIndex(idx);
  }, [times.length]);

  const scrollToTime = useCallback(
    (timeHm: string, smooth: boolean) => {
      const el = scrollRef.current;
      if (!el || times.length === 0) return;
      const idx = times.indexOf(timeHm);
      if (idx < 0) return;
      programmaticScroll.current = true;
      scrollToIndex(el, idx, smooth);
      setCenteredIndex(idx);
      window.setTimeout(() => {
        programmaticScroll.current = false;
      }, smooth ? 320 : 50);
    },
    [times],
  );

  useEffect(() => {
    if (!open || times.length === 0) return;
    const initialIdx = value && times.includes(value) ? times.indexOf(value) : 0;
    setCenteredIndex(initialIdx);
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      programmaticScroll.current = true;
      scrollToIndex(el, initialIdx, false);
      programmaticScroll.current = false;
      setCenteredIndex(getCenteredIndex(el, times.length));
    });
  }, [open, value, times]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const snapToCenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el || times.length === 0) return;
    const idx = getCenteredIndex(el, times.length);
    scrollToIndex(el, idx, true);
    setCenteredIndex(idx);
  }, [times.length]);

  const handleScroll = () => {
    if (programmaticScroll.current) return;
    applyIndexFromScroll();
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(snapToCenter, 120);
  };

  const handleScrollEnd = () => {
    if (programmaticScroll.current) return;
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = null;
    }
    snapToCenter();
  };

  const handleConfirm = () => {
    const el = scrollRef.current;
    if (!el || times.length === 0) return;
    const idx = getCenteredIndex(el, times.length);
    const time = times[idx];
    if (!time) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    onConfirm(time);
  };

  const handleTapIndex = (idx: number) => {
    scrollToTime(times[idx] ?? '', true);
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f172a]/45 backdrop-blur-[2px] transition-opacity"
        aria-label="Yopish"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className="relative mx-auto w-full max-w-lg rounded-t-[28px] bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_48px_rgba(15,23,42,0.18)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[17px] font-bold text-[#121212]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {times.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Mavjud vaqtlar yo‘q</p>
        ) : (
          <div className="relative mx-auto max-w-xs">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-white to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-white to-transparent"
              aria-hidden
            />

            {/* Active time lives inside the highlight band */}
            <div
              className="pointer-events-none absolute inset-x-2 top-1/2 z-30 flex -translate-y-1/2 items-center justify-center rounded-2xl border-2 border-[#22c55e]/35 bg-[#f0fdf4]/95 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.12)]"
              style={{ height: ITEM_H }}
              aria-hidden={false}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-[28px] font-bold tabular-nums text-[#22c55e]">{activeTime}</span>
            </div>

            <div
              ref={scrollRef}
              className="bb-scrollbar-hide snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
              style={{ height: ITEM_H * VISIBLE_COUNT }}
              onScroll={handleScroll}
              onScrollEnd={handleScrollEnd}
            >
              <div style={{ height: ITEM_H * PAD_COUNT }} aria-hidden />
              {times.map((time, idx) => {
                const distance = Math.abs(idx - centeredIndex);
                const opacity = distance === 0 ? 0 : distance === 1 ? 0.35 : 0.18;
                return (
                  <button
                    key={time}
                    type="button"
                    aria-label={time}
                    onClick={() => handleTapIndex(idx)}
                    className="flex w-full snap-center items-center justify-center"
                    style={{ height: ITEM_H }}
                  >
                    <span
                      className="tabular-nums text-[18px] font-medium text-slate-500 transition-opacity duration-150"
                      style={{ opacity }}
                    >
                      {time}
                    </span>
                  </button>
                );
              })}
              <div style={{ height: ITEM_H * PAD_COUNT }} aria-hidden />
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            disabled={!activeTime}
            onClick={handleConfirm}
            className="min-h-12 rounded-2xl bg-[#22c55e] text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)] disabled:opacity-50"
          >
            Tayyor
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

export const TimeWheelPickerSheet = memo(TimeWheelPickerSheetInner);
