'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, Clock, Zap } from 'lucide-react';
import { TimeWheelPickerSheet } from '@/components/checkout/time-wheel-picker-sheet';
import {
  SCHEDULE_DELIVERY_HELPER_UZ,
  buildWheelTimeOptions,
  fetchSchedulingRules,
  formatScheduleTimeLabel,
  validateScheduleSelection,
  type SchedulingRules,
  type ScheduleSelection,
  type WheelTimePlan,
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

function applyTime(
  rules: SchedulingRules | null,
  plan: WheelTimePlan | null,
  timeHm: string,
): SchedulePickerValue {
  const dateKey = plan?.dateKey ?? rules?.todayDateKey ?? '';
  const selection = rules
    ? validateScheduleSelection(rules, dateKey, timeHm)
    : { valid: false, error: 'Qoidalar yuklanmoqda' };
  return { dateKey, timeHm, selection };
}

function DeliveryTimeSelectorInner({ enabled, mode, onModeChange, value, onChange }: Props) {
  const [rules, setRules] = useState<SchedulingRules | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const wheelPlan = useMemo(() => {
    if (!rules) return null;
    return buildWheelTimeOptions(rules);
  }, [rules]);

  const handleModeNow = () => {
    onModeChange('now');
    onChange({ dateKey: '', timeHm: '', selection: emptySelection });
    setPickerOpen(false);
  };

  const handleModeSchedule = () => {
    onModeChange('schedule');
    onChange({ dateKey: '', timeHm: '', selection: emptySelection });
  };

  const handleConfirmTime = (timeHm: string) => {
    onChange(applyTime(rules, wheelPlan, timeHm));
    setPickerOpen(false);
  };

  if (!enabled) return null;

  const hasTime = Boolean(value.timeHm && value.selection.valid);
  const timeLabel = formatScheduleTimeLabel(value.timeHm, wheelPlan);

  return (
    <>
      <section className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#22c55e]" strokeWidth={2} />
          <h2 className="text-[16px] font-bold text-[#121212]">Yetkazish vaqti</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleModeNow}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[20px] border px-2 py-2.5 text-center text-xs font-bold transition active:scale-[0.98] ${
              mode === 'now'
                ? 'border-[#22c55e] bg-[#f0fdf4] text-[#166534] shadow-[0_4px_16px_rgba(34,197,94,0.15)]'
                : 'border-slate-100 bg-[#fafafa] text-slate-600'
            }`}
          >
            <Zap className="h-4 w-4" />
            Hozir yetkazish
          </button>
          <button
            type="button"
            onClick={handleModeSchedule}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[20px] border px-2 py-2.5 text-center text-xs font-bold transition active:scale-[0.98] ${
              mode === 'schedule'
                ? 'border-[#22c55e] bg-[#f0fdf4] text-[#166534] shadow-[0_4px_16px_rgba(34,197,94,0.15)]'
                : 'border-slate-100 bg-[#fafafa] text-slate-600'
            }`}
          >
            <Clock className="h-4 w-4" />
            Reja qilish
          </button>
        </div>

        {mode === 'schedule' ? (
          <div className="mt-4 space-y-3">
            {rulesLoading ? (
              <div className="bb-skeleton h-14 w-full rounded-[20px]" />
            ) : !wheelPlan?.times.length ? (
              <p className="rounded-[20px] bg-amber-50 px-3 py-3 text-center text-xs font-medium text-amber-900">
                Bugun va ertaga uchun mavjud vaqt topilmadi
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[20px] border border-slate-100 bg-[#fafafa] px-4 py-3 text-left transition active:bg-slate-50"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Yetkazish vaqti
                    </p>
                    <p
                      className={`mt-0.5 tabular-nums ${
                        hasTime
                          ? 'text-[22px] font-bold text-[#22c55e]'
                          : 'text-[15px] font-semibold text-slate-600'
                      }`}
                    >
                      {hasTime ? value.timeHm : 'Vaqtni tanlang'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>

                {hasTime ? (
                  <div className="space-y-2 rounded-[20px] border border-[#bbf7d0] bg-[#f0fdf4] px-3.5 py-3">
                    <p className="text-[15px] font-bold text-[#166534]">{timeLabel}</p>
                    <p className="text-[12px] leading-snug text-[#15803d]/90">{SCHEDULE_DELIVERY_HELPER_UZ}</p>
                  </div>
                ) : (
                  <p className="rounded-[20px] border border-amber-100 bg-amber-50 px-3 py-2.5 text-center text-xs font-medium text-amber-900">
                    Yetkazish vaqtini tanlang
                  </p>
                )}

                {value.selection.error && !hasTime ? (
                  <p className="text-center text-xs font-medium text-rose-600">{value.selection.error}</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>

      <TimeWheelPickerSheet
        open={pickerOpen && mode === 'schedule'}
        times={wheelPlan?.times ?? []}
        value={value.timeHm}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleConfirmTime}
      />
    </>
  );
}

export const DeliveryTimeSelector = memo(DeliveryTimeSelectorInner);
