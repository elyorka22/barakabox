'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Zap } from 'lucide-react';
import {
  fetchDeliverySlots,
  formatPickerDateLabel,
  getTashkentDateKey,
  type DeliverySlot,
} from '@/lib/scheduled-delivery';

export type DeliveryTimeMode = 'now' | 'schedule';

type Props = {
  enabled: boolean;
  mode: DeliveryTimeMode;
  onModeChange: (mode: DeliveryTimeMode) => void;
  selectedSlotKey: string | null;
  onSlotChange: (slotKey: string | null, label: string | null) => void;
};

function SlotSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden pb-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bb-skeleton h-11 min-w-[108px] shrink-0 rounded-xl" />
      ))}
    </div>
  );
}

export function DeliveryTimeSelector({
  enabled,
  mode,
  onModeChange,
  selectedSlotKey,
  onSlotChange,
}: Props) {
  const todayKey = useMemo(() => getTashkentDateKey(), []);
  const [dateKey, setDateKey] = useState(todayKey);
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customDateOpen, setCustomDateOpen] = useState(false);

  const loadSlots = useCallback(
    async (targetDate: string) => {
      const resolved = targetDate.trim() || todayKey;
      setLoading(true);
      setError('');
      try {
        const res = await fetchDeliverySlots(resolved);
        setDateKey(res.dateKey);
        setDates(res.dates.length > 0 ? res.dates : [res.dateKey]);
        setSlots(res.slots);
      } catch (err) {
        setSlots([]);
        setError(err instanceof Error ? err.message : 'Vaqtlar yuklanmadi');
      } finally {
        setLoading(false);
      }
    },
    [todayKey],
  );

  useEffect(() => {
    if (!enabled || mode !== 'schedule') return;
    void loadSlots(todayKey);
  }, [enabled, mode, todayKey, loadSlots]);

  const pickerDates = dates.length > 0 ? dates : [dateKey || todayKey];
  const availableCount = slots.filter((s) => s.available).length;

  if (!enabled) return null;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-[#16A34A]" strokeWidth={2} />
        <h2 className="text-[15px] font-bold text-[#121212]">Yetkazish vaqti</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onModeChange('now');
            onSlotChange(null, null);
            setCustomDateOpen(false);
          }}
          className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-center text-xs font-bold transition ${
            mode === 'now'
              ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534] ring-2 ring-[#16A34A]/15'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <Zap className="h-4 w-4" />
          Hozir yetkazish
        </button>
        <button
          type="button"
          onClick={() => {
            onModeChange('schedule');
            onSlotChange(null, null);
            setDateKey(todayKey);
            setCustomDateOpen(false);
            void loadSlots(todayKey);
          }}
          className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-center text-xs font-bold transition ${
            mode === 'schedule'
              ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534] ring-2 ring-[#16A34A]/15'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <Clock className="h-4 w-4" />
          Reja qilish
        </button>
      </div>

      {mode === 'schedule' ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sana</p>
            <div className="bb-scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              {pickerDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDateKey(d);
                    onSlotChange(null, null);
                    setCustomDateOpen(false);
                    void loadSlots(d);
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    dateKey === d && !customDateOpen
                      ? 'bg-[#16A34A] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 active:bg-slate-200'
                  }`}
                >
                  {formatPickerDateLabel(d, todayKey)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomDateOpen((v) => !v)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  customDateOpen ? 'bg-[#16A34A] text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Boshqa sana
              </button>
            </div>
            {customDateOpen ? (
              <input
                type="date"
                min={todayKey}
                value={dateKey}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) return;
                  setDateKey(next);
                  onSlotChange(null, null);
                  void loadSlots(next);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#16A34A]/20"
              />
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Vaqt oralig‘i
            </p>
            {loading ? (
              <SlotSkeleton />
            ) : error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
            ) : slots.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Bu kunda bo‘sh vaqt yo‘q. Boshqa sanani tanlang.
              </p>
            ) : (
              <div className="bb-scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {slots.map((slot) => {
                  const selected = selectedSlotKey === slot.slotKey;
                  return (
                    <button
                      key={slot.slotKey}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => onSlotChange(slot.slotKey, slot.label)}
                      className={`min-w-[108px] shrink-0 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                        selected
                          ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534] ring-2 ring-[#16A34A]/20'
                          : slot.available
                            ? 'border-slate-200 bg-white text-slate-800 active:scale-[0.98]'
                            : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <span className="block whitespace-nowrap leading-snug">{slot.label}</span>
                      {!slot.available ? (
                        <span className="mt-0.5 block text-[10px] font-bold text-rose-500">Band</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            {!loading && !error && availableCount === 0 && slots.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800">Mavjud vaqtlar tugagan. Boshqa kunni tanlang.</p>
            ) : null}
          </div>

          {!selectedSlotKey ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              Yetkazish vaqtini tanlang
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
