'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Zap } from 'lucide-react';
import {
  fetchSchedulingRules,
  formatDisplayDate,
  getTimeBoundsForDate,
  getTashkentDateKey,
  validateScheduleSelection,
  type SchedulingRules,
  type ScheduleSelection,
} from '@/lib/scheduled-delivery';

export type DeliveryTimeMode = 'now' | 'schedule';

export type SchedulePickerValue = {
  dateKey: string;
  timeHm: string;
  selection: ScheduleSelection;
};

type Props = {
  enabled: boolean;
  mode: DeliveryTimeMode;
  onModeChange: (mode: DeliveryTimeMode) => void;
  value: SchedulePickerValue;
  onChange: (value: SchedulePickerValue) => void;
};

const emptySelection: ScheduleSelection = { valid: false };

function DeliveryTimeSelectorInner({ enabled, mode, onModeChange, value, onChange }: Props) {
  const [rules, setRules] = useState<SchedulingRules | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setRulesLoading(true);
    void fetchSchedulingRules()
      .then((r) => {
        if (!cancelled) setRules(r);
      })
      .catch(() => {
        if (!cancelled) setRules(null);
      })
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const todayKey = rules?.todayDateKey ?? getTashkentDateKey();
  const maxDate = rules?.maxDateKey ?? todayKey;

  const timeBounds = useMemo(() => {
    if (!rules || !value.dateKey) return { minHm: '09:00', maxHm: '20:59' };
    return getTimeBoundsForDate(rules, value.dateKey);
  }, [rules, value.dateKey]);

  const patch = (dateKey: string, timeHm: string) => {
    const selection = rules
      ? validateScheduleSelection(rules, dateKey, timeHm)
      : { valid: false, error: 'Qoidalar yuklanmoqda' };
    onChange({ dateKey, timeHm, selection });
  };

  const handleModeNow = () => {
    onModeChange('now');
    onChange({ dateKey: '', timeHm: '', selection: emptySelection });
  };

  const handleModeSchedule = () => {
    onModeChange('schedule');
    onChange({ dateKey: todayKey, timeHm: '', selection: emptySelection });
  };

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
          onClick={handleModeNow}
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
          onClick={handleModeSchedule}
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
        <div className="mt-4 space-y-4">
          {rulesLoading ? (
            <div className="space-y-3">
              <div className="bb-skeleton h-12 w-full rounded-xl" />
              <div className="bb-skeleton h-12 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Yetkazish sanasi
                </span>
                <input
                  type="date"
                  min={todayKey}
                  max={maxDate}
                  value={value.dateKey || todayKey}
                  onChange={(e) => patch(e.target.value, value.timeHm)}
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] font-medium text-[#121212] outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/15"
                />
                {value.dateKey ? (
                  <span className="mt-1 block text-xs text-slate-500">{formatDisplayDate(value.dateKey)}</span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Yetkazish vaqti
                </span>
                <input
                  type="time"
                  min={timeBounds.minHm}
                  max={timeBounds.maxHm}
                  step={60}
                  value={value.timeHm}
                  onChange={(e) => patch(value.dateKey || todayKey, e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] font-semibold tabular-nums text-[#121212] outline-none transition focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/15"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Mavjud: {timeBounds.minHm} – {timeBounds.maxHm}
                  {rules ? ` · tayyorlash ${rules.minDelayMinutes} daq` : ''}
                </span>
              </label>

              {value.selection.valid && value.selection.summaryLabel ? (
                <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-[13px] font-semibold leading-snug text-violet-900">
                  {value.selection.summaryLabel}
                </p>
              ) : value.selection.error ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  {value.selection.error}
                </p>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  Sanani va vaqtni tanlang
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

export const DeliveryTimeSelector = memo(DeliveryTimeSelectorInner);
