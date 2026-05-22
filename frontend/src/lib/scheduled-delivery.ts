import { api } from '@/lib/api';

export type PublicSchedulingConfig = {
  enabled: boolean;
  slotMinutes?: number;
  workStartHour: number;
  workEndHour: number;
  minDelayMinutes: number;
};

export type SchedulingSettings = PublicSchedulingConfig & {
  scheduledOrdersEnabled: boolean;
  maxOrdersPerSlot?: number;
  prepLeadMinutes?: number;
};

export type SchedulingRules = {
  enabled: boolean;
  workStartHour: number;
  workEndHour: number;
  minDelayMinutes: number;
  maxDaysAhead: number;
  todayDateKey: string;
  maxDateKey: string;
};

export type ScheduleSelection = {
  valid: boolean;
  error?: string;
  scheduledAtIso?: string;
  summaryLabel?: string;
  dateKey?: string;
  timeHm?: string;
};

export type WheelTimePlan = {
  dateKey: string;
  times: string[];
  isTomorrow: boolean;
};

const RULES_CACHE_MS = 60_000;
let rulesCache: { at: number; data: SchedulingRules } | null = null;

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const WHEEL_STEP_MIN = 30;

/** Current calendar date in Asia/Tashkent (YYYY-MM-DD). */
export function getTashkentDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + days, 12, 0, 0);
  return getTashkentDateKey(new Date(utc));
}

function tashkentLocalToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - TZ_OFFSET_MS);
}

function formatTimeHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTimeHm(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function hmToMinutes(hm: string): number {
  const p = parseTimeHm(hm);
  if (!p) return 0;
  return p.hour * 60 + p.minute;
}

function minutesToHm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return formatTimeHm(h, m);
}

function ceilToStepMinutes(total: number, step = WHEEL_STEP_MIN): number {
  return Math.ceil(total / step) * step;
}

export function formatDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getTimeBoundsForDate(rules: SchedulingRules, dateKey: string, now = new Date()) {
  let minHour = rules.workStartHour;
  let minMinute = 0;

  if (dateKey === rules.todayDateKey) {
    const minMs = now.getTime() + rules.minDelayMinutes * 60_000;
    const minLocal = new Date(minMs + TZ_OFFSET_MS);
    const delayHour = minLocal.getUTCHours();
    const delayMinute = minLocal.getUTCMinutes();
    if (delayHour > minHour || (delayHour === minHour && delayMinute > minMinute)) {
      minHour = delayHour;
      minMinute = delayMinute;
    }
  }

  const dayStartMin = rules.workStartHour * 60;
  const minTotal = minHour * 60 + minMinute;
  if (minTotal < dayStartMin) {
    minHour = rules.workStartHour;
    minMinute = 0;
  }

  const lastMinute = Math.max(0, rules.workEndHour * 60 - 1);
  const maxHour = Math.floor(lastMinute / 60);
  const maxMinute = lastMinute % 60;

  return { minHm: formatTimeHm(minHour, minMinute), maxHm: formatTimeHm(maxHour, maxMinute) };
}

/** Build 30-minute wheel options; uses today, or tomorrow if today has no valid times. */
export function buildWheelTimeOptions(rules: SchedulingRules, now = new Date()): WheelTimePlan | null {
  if (!rules.enabled) return null;

  const buildForDate = (dateKey: string): string[] => {
    const bounds = getTimeBoundsForDate(rules, dateKey, now);
    let start = ceilToStepMinutes(hmToMinutes(bounds.minHm), WHEEL_STEP_MIN);
    const end = hmToMinutes(bounds.maxHm);
    const times: string[] = [];
    for (let m = start; m <= end; m += WHEEL_STEP_MIN) {
      times.push(minutesToHm(m));
    }
    return times;
  };

  const todayTimes = buildForDate(rules.todayDateKey);
  if (todayTimes.length > 0) {
    return { dateKey: rules.todayDateKey, times: todayTimes, isTomorrow: false };
  }

  const tomorrowKey = addDaysToDateKey(rules.todayDateKey, 1);
  const tomorrowTimes = buildForDate(tomorrowKey);
  if (tomorrowTimes.length > 0) {
    return { dateKey: tomorrowKey, times: tomorrowTimes, isTomorrow: true };
  }

  return null;
}

export function formatScheduleTimeLabel(
  timeHm: string,
  plan: WheelTimePlan | null,
): string {
  if (!timeHm) return '';
  if (!plan) return timeHm;
  return plan.isTomorrow ? `Ertaga ${timeHm}` : `Bugun ${timeHm}`;
}

export const SCHEDULE_DELIVERY_HELPER_UZ =
  'Belgilangan vaqtingizdan taxminan 20 daqiqa ichida yetkazib beramiz';

export function validateScheduleSelection(
  rules: SchedulingRules | null,
  dateKey: string,
  timeHm: string,
  now = new Date(),
): ScheduleSelection {
  if (!rules?.enabled) {
    return { valid: false, error: 'Rejalashtirilgan yetkazish o‘chirilgan' };
  }
  if (!timeHm.trim()) {
    return { valid: false, error: 'Vaqtni tanlang' };
  }

  const hm = parseTimeHm(timeHm);
  if (!hm) {
    return { valid: false, error: 'Vaqt noto‘g‘ri' };
  }

  const resolvedDate =
    dateKey.trim() ||
    rules.todayDateKey;

  if (resolvedDate < rules.todayDateKey || resolvedDate > rules.maxDateKey) {
    return { valid: false, error: 'Sana mavjud emas' };
  }

  const [year, month, day] = resolvedDate.split('-').map(Number);
  const scheduledAt = tashkentLocalToUtc(year, month, day, hm.hour, hm.minute);
  const minAllowedMs = now.getTime() + rules.minDelayMinutes * 60_000;
  if (scheduledAt.getTime() < minAllowedMs) {
    return { valid: false, error: 'Bu vaqt allaqachon o‘tib ketgan' };
  }

  const dayStart = tashkentLocalToUtc(year, month, day, rules.workStartHour, 0);
  const dayEnd = tashkentLocalToUtc(year, month, day, rules.workEndHour, 0);
  if (scheduledAt.getTime() < dayStart.getTime() || scheduledAt.getTime() >= dayEnd.getTime()) {
    return { valid: false, error: 'Faqat ish vaqtida yetkazish mumkin' };
  }

  const bounds = getTimeBoundsForDate(rules, resolvedDate, now);
  if (timeHm < bounds.minHm || timeHm > bounds.maxHm) {
    return { valid: false, error: `Vaqt ${bounds.minHm}–${bounds.maxHm} oralig‘ida bo‘lishi kerak` };
  }

  const isTomorrow = resolvedDate !== rules.todayDateKey;
  const summaryLabel = isTomorrow
    ? `Ertaga soat ${timeHm} da yetkaziladi`
    : `Bugun soat ${timeHm} da yetkaziladi`;

  return {
    valid: true,
    scheduledAtIso: scheduledAt.toISOString(),
    summaryLabel,
    dateKey: resolvedDate,
    timeHm,
  };
}

export async function fetchSchedulingRules(): Promise<SchedulingRules> {
  if (rulesCache && Date.now() - rulesCache.at < RULES_CACHE_MS) {
    return rulesCache.data;
  }
  const data = await api.get<SchedulingRules>('/delivery/scheduling-rules');
  rulesCache = { at: Date.now(), data };
  return data;
}

export async function fetchSchedulingSettingsAdmin(token: string): Promise<SchedulingSettings> {
  return api.get<SchedulingSettings>('/settings/scheduling', token);
}

export async function updateSchedulingSettingsAdmin(
  token: string,
  body: Partial<SchedulingSettings & { scheduledOrdersEnabled?: boolean }>,
): Promise<SchedulingSettings> {
  return api.patch<SchedulingSettings>('/admin/settings/scheduling', body, token);
}

export function formatScheduledDeliveryMessage(
  label: string | null | undefined,
  scheduledAt: string | null | undefined,
): string | null {
  if (label?.trim()) return label.trim();
  if (!scheduledAt) return null;
  try {
    const d = new Date(scheduledAt);
    return d.toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function formatScheduleOrderSummary(summaryLabel: string | null | undefined): string | null {
  return summaryLabel?.trim() || null;
}
