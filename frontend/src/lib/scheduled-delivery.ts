import { api } from '@/lib/api';

export type DeliverySlot = {
  slotKey: string;
  dateKey: string;
  label: string;
  startAt: string;
  endAt: string;
  available: boolean;
  bookedCount: number;
  maxOrders: number;
};

export type DeliverySlotsResponse = {
  dateKey: string;
  dates: string[];
  slots: DeliverySlot[];
};

export type PublicSchedulingConfig = {
  enabled: boolean;
  slotMinutes: number;
  workStartHour: number;
  workEndHour: number;
  minDelayMinutes: number;
};

export type SchedulingSettings = PublicSchedulingConfig & {
  scheduledOrdersEnabled: boolean;
  maxOrdersPerSlot: number;
  prepLeadMinutes: number;
};

const SLOTS_CACHE_MS = 30_000;
const slotsCache = new Map<string, { at: number; data: DeliverySlotsResponse }>();
let slotsInflight: Promise<DeliverySlotsResponse> | null = null;
let slotsInflightKey = '';

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
  const shifted = new Date(utc);
  return getTashkentDateKey(shifted);
}

export function formatPickerDateLabel(dateKey: string, todayKey = getTashkentDateKey()): string {
  const tomorrow = addDaysToDateKey(todayKey, 1);
  if (dateKey === todayKey) return 'Bugun';
  if (dateKey === tomorrow) return 'Ertaga';
  const [year, month, day] = dateKey.split('-').map(Number);
  try {
    const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('uz-UZ', {
      day: 'numeric',
      month: 'long',
    });
    return label;
  } catch {
    return dateKey;
  }
}

export async function fetchDeliverySlots(dateKey: string): Promise<DeliverySlotsResponse> {
  const key = dateKey.trim() || getTashkentDateKey();
  const cached = slotsCache.get(key);
  if (cached && Date.now() - cached.at < SLOTS_CACHE_MS) {
    return cached.data;
  }

  if (slotsInflight && slotsInflightKey === key) return slotsInflight;

  slotsInflightKey = key;
  slotsInflight = api
    .get<DeliverySlotsResponse>(`/delivery/slots?date=${encodeURIComponent(key)}`)
    .then((data) => {
      slotsCache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      slotsInflight = null;
      slotsInflightKey = '';
    });

  return slotsInflight;
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
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function formatScheduleOrderSummary(slotLabel: string | null | undefined): string | null {
  if (!slotLabel?.trim()) return null;
  return `Buyurtma ${slotLabel.trim()} oralig‘ida yetkaziladi`;
}
