/** Storefront scheduling uses Asia/Tashkent (UTC+5). */
export const SCHEDULE_TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

export type SchedulingSettings = {
  scheduledOrdersEnabled: boolean;
  slotMinutes: number;
  workStartHour: number;
  workEndHour: number;
  minDelayMinutes: number;
  maxOrdersPerSlot: number;
  prepLeadMinutes: number;
};

export type DeliverySlotDto = {
  slotKey: string;
  dateKey: string;
  label: string;
  startAt: string;
  endAt: string;
  available: boolean;
  bookedCount: number;
  maxOrders: number;
};

export const defaultSchedulingSettings = (): SchedulingSettings => ({
  scheduledOrdersEnabled: true,
  slotMinutes: 60,
  workStartHour: 9,
  workEndHour: 21,
  minDelayMinutes: 60,
  maxOrdersPerSlot: 20,
  prepLeadMinutes: 30,
});

export function mapSchedulingSettings(row: {
  scheduledOrdersEnabled?: boolean | null;
  scheduleSlotMinutes?: number | null;
  scheduleWorkStartHour?: number | null;
  scheduleWorkEndHour?: number | null;
  scheduleMinDelayMinutes?: number | null;
  scheduleMaxOrdersPerSlot?: number | null;
  schedulePrepLeadMinutes?: number | null;
} | null): SchedulingSettings {
  const d = defaultSchedulingSettings();
  if (!row) return d;
  return {
    scheduledOrdersEnabled:
      typeof row.scheduledOrdersEnabled === 'boolean' ? row.scheduledOrdersEnabled : d.scheduledOrdersEnabled,
    slotMinutes: clampSlotMinutes(row.scheduleSlotMinutes ?? d.slotMinutes),
    workStartHour: clampHour(row.scheduleWorkStartHour ?? d.workStartHour),
    workEndHour: clampHour(row.scheduleWorkEndHour ?? d.workEndHour),
    minDelayMinutes: Math.max(15, Math.min(24 * 60, Math.round(row.scheduleMinDelayMinutes ?? d.minDelayMinutes))),
    maxOrdersPerSlot: Math.max(1, Math.min(500, Math.round(row.scheduleMaxOrdersPerSlot ?? d.maxOrdersPerSlot))),
    prepLeadMinutes: Math.max(5, Math.min(24 * 60, Math.round(row.schedulePrepLeadMinutes ?? d.prepLeadMinutes))),
  };
}

function clampHour(h: number): number {
  return Math.max(0, Math.min(23, Math.round(h)));
}

export function clampSlotMinutes(m: number): 30 | 60 {
  return m <= 30 ? 30 : 60;
}

/** Current instant in Tashkent as parts. */
export function getTashkentParts(now = new Date()) {
  const local = new Date(now.getTime() + SCHEDULE_TZ_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    dateKey: formatDateKey(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate()),
  };
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** UTC Date for a wall-clock time in Tashkent. */
export function tashkentLocalToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - SCHEDULE_TZ_OFFSET_MS);
}

export function formatTimeHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function buildSlotKey(dateKey: string, startHm: string, endHm: string): string {
  return `${dateKey}|${startHm}-${endHm}`;
}

export function parseSlotKey(slotKey: string): { dateKey: string; startHm: string; endHm: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(slotKey.trim());
  if (!m) return null;
  return { dateKey: m[1], startHm: m[2], endHm: m[3] };
}

function parseHm(hm: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatSlotLabel(dateKey: string, startHm: string, endHm: string, now = new Date()): string {
  const today = getTashkentParts(now).dateKey;
  const tomorrow = addDaysToDateKey(today, 1);
  const prefix = dateKey === today ? 'Bugun' : dateKey === tomorrow ? 'Ertaga' : dateKey;
  return `${prefix} ${startHm}–${endHm}`;
}

function addDaysToDateKey(dateKey: string, addDays: number): string {
  const p = parseDateKey(dateKey);
  if (!p) return dateKey;
  const utc = tashkentLocalToUtc(p.year, p.month, p.day + addDays, 12, 0);
  const local = new Date(utc.getTime() + SCHEDULE_TZ_OFFSET_MS);
  return formatDateKey(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
}

export function listDatesForPicker(daysAhead = 7, now = new Date()): string[] {
  const start = getTashkentParts(now).dateKey;
  const out: string[] = [];
  for (let i = 0; i < daysAhead; i += 1) {
    out.push(addDaysToDateKey(start, i));
  }
  return out;
}

export function generateSlotsForDate(
  dateKey: string,
  settings: SchedulingSettings,
  bookedBySlotKey: Map<string, number>,
  now = new Date(),
): DeliverySlotDto[] {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return [];

  const { slotMinutes, workStartHour, workEndHour, minDelayMinutes, maxOrdersPerSlot } = settings;
  const minStartMs = now.getTime() + minDelayMinutes * 60_000;
  const slots: DeliverySlotDto[] = [];

  let cursorMin = workStartHour * 60;
  const endMin = workEndHour * 60;
  if (endMin <= cursorMin) return [];

  while (cursorMin + slotMinutes <= endMin) {
    const startHour = Math.floor(cursorMin / 60);
    const startMinute = cursorMin % 60;
    const endTotal = cursorMin + slotMinutes;
    const endHour = Math.floor(endTotal / 60);
    const endMinute = endTotal % 60;
    const startHm = formatTimeHm(startHour, startMinute);
    const endHm = formatTimeHm(endHour, endMinute);
    const slotKey = buildSlotKey(dateKey, startHm, endHm);
    const startAt = tashkentLocalToUtc(parsed.year, parsed.month, parsed.day, startHour, startMinute);
    const endAt = tashkentLocalToUtc(parsed.year, parsed.month, parsed.day, endHour, endMinute);
    const bookedCount = bookedBySlotKey.get(slotKey) ?? 0;
    const inFuture = startAt.getTime() >= minStartMs;
    const hasCapacity = bookedCount < maxOrdersPerSlot;

    slots.push({
      slotKey,
      dateKey,
      label: formatSlotLabel(dateKey, startHm, endHm, now),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      available: inFuture && hasCapacity,
      bookedCount,
      maxOrders: maxOrdersPerSlot,
    });

    cursorMin += slotMinutes;
  }

  return slots;
}

export function resolveScheduledSlot(
  slotKey: string,
  settings: SchedulingSettings,
  bookedBySlotKey: Map<string, number>,
  now = new Date(),
): {
  scheduledAt: Date;
  scheduledSlotEnd: Date;
  deliverySlot: string;
  label: string;
} {
  if (!settings.scheduledOrdersEnabled) {
    throw new Error('Scheduled delivery is disabled');
  }
  const parsed = parseSlotKey(slotKey);
  if (!parsed) {
    throw new Error('Invalid delivery slot');
  }
  const start = parseHm(parsed.startHm);
  const end = parseHm(parsed.endHm);
  if (!start || !end) {
    throw new Error('Invalid delivery slot times');
  }
  const dateParts = parseDateKey(parsed.dateKey);
  if (!dateParts) {
    throw new Error('Invalid schedule date');
  }

  const slots = generateSlotsForDate(parsed.dateKey, settings, bookedBySlotKey, now);
  const match = slots.find((s) => s.slotKey === slotKey);
  if (!match || !match.available) {
    throw new Error('Selected delivery slot is not available');
  }

  const scheduledAt = new Date(match.startAt);
  const scheduledSlotEnd = new Date(match.endAt);
  if (scheduledAt.getTime() <= now.getTime()) {
    throw new Error('Scheduled time must be in the future');
  }

  return {
    scheduledAt,
    scheduledSlotEnd,
    deliverySlot: slotKey,
    label: match.label,
  };
}
