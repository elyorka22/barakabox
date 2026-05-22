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

function TimeWheelPickerSheetInner({
  open,
  title = 'Yetkazish vaqtini tanlang',
  times,
  value,
  onClose,
  onConfirm,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(value);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToTime = useCallback(
    (timeHm: string, smooth = true) => {
      const el = scrollRef.current;
      if (!el || times.length === 0) return;
      const idx = Math.max(0, times.indexOf(timeHm));
      const top = idx * ITEM_H;
      el.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    },
    [times],
  );

  const syncActiveFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || times.length === 0) return;
    const center = el.scrollTop + (el.clientHeight - ITEM_H) / 2;
    const idx = Math.min(times.length - 1, Math.max(0, Math.round(center / ITEM_H)));
    const next = times[idx];
    if (next) setActive(next);
  }, [times]);

  useEffect(() => {
    if (!open) return;
    const initial = value && times.includes(value) ? value : times[0] ?? '';
    setActive(initial);
    requestAnimationFrame(() => {
      if (initial) scrollToTime(initial, false);
    });
  }, [open, value, times, scrollToTime]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleScroll = () => {
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(syncActiveFromScroll, 80);
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
              className="pointer-events-none absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-2xl border-2 border-[#22c55e]/30 bg-[#f0fdf4]/90"
              style={{ height: ITEM_H }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-white to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-white to-transparent"
              aria-hidden
            />

            <div
              ref={scrollRef}
              className="bb-scrollbar-hide snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth"
              style={{ height: ITEM_H * VISIBLE_COUNT }}
              onScroll={handleScroll}
            >
              <div style={{ height: ITEM_H * PAD_COUNT }} aria-hidden />
              {times.map((time) => {
                const selected = active === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      setActive(time);
                      scrollToTime(time);
                    }}
                    className="flex w-full snap-center items-center justify-center"
                    style={{ height: ITEM_H }}
                  >
                    <span
                      className={`tabular-nums transition-all duration-200 ${
                        selected
                          ? 'scale-110 text-[26px] font-bold text-[#22c55e]'
                          : 'text-[18px] font-medium text-slate-400'
                      }`}
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
            disabled={!active}
            onClick={() => {
              if (active) onConfirm(active);
            }}
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
