'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Clock, Zap } from 'lucide-react';
import { fetchDeliverySlots, type DeliverySlot } from '@/lib/scheduled-delivery';

export type DeliveryTimeMode = 'now' | 'schedule';

type Props = {
  enabled: boolean;
  mode: DeliveryTimeMode;
  onModeChange: (mode: DeliveryTimeMode) => void;
  selectedSlotKey: string | null;
  onSlotChange: (slotKey: string | null, label: string | null) => void;
};

export function DeliveryTimeSelector({
  enabled,
  mode,
  onModeChange,
  selectedSlotKey,
  onSlotChange,
}: Props) {
  const [dateKey, setDateKey] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSlots = useCallback(async (targetDate: string) => {
    if (!targetDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchDeliverySlots(targetDate);
      setDates(res.dates);
      setSlots(res.slots);
      if (!dateKey) setDateKey(res.dateKey);
      const firstAvailable = res.slots.find((s) => s.available);
      if (mode === 'schedule' && firstAvailable && !selectedSlotKey) {
        onSlotChange(firstAvailable.slotKey, firstAvailable.label);
      }
    } catch (err) {
      setSlots([]);
      setError(err instanceof Error ? err.message : 'Vaqtlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [dateKey, mode, onSlotChange, selectedSlotKey]);

  useEffect(() => {
    if (!enabled || mode !== 'schedule') return;
    const initial = dateKey || dates[0];
    if (initial) void loadSlots(initial);
  }, [enabled, mode, dateKey, dates, loadSlots]);

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
          onClick={() => onModeChange('schedule')}
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
          <div className="bb-scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {(dates.length ? dates : [dateKey]).filter(Boolean).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDateKey(d);
                  onSlotChange(null, null);
                  void loadSlots(d);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  dateKey === d ? 'bg-[#16A34A] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-xs text-slate-500">Vaqtlar yuklanmoqda…</p>
          ) : error ? (
            <p className="rounded-lg bg-rose-50 px-2 py-2 text-xs text-rose-700">{error}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.slotKey}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onSlotChange(slot.slotKey, slot.label)}
                  className={`rounded-xl border px-2 py-2.5 text-left text-xs font-semibold transition ${
                    selectedSlotKey === slot.slotKey
                      ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534]'
                      : slot.available
                        ? 'border-slate-200 bg-white text-slate-700'
                        : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {slot.label}
                  {!slot.available ? (
                    <span className="mt-0.5 block text-[10px] font-medium">Band</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
