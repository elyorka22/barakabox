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

let slotsInflight: Promise<DeliverySlotsResponse> | null = null;
let slotsInflightKey = '';

export async function fetchDeliverySlots(dateKey: string): Promise<DeliverySlotsResponse> {
  const key = dateKey.trim();
  if (slotsInflight && slotsInflightKey === key) return slotsInflight;
  slotsInflightKey = key;
  slotsInflight = api
    .get<DeliverySlotsResponse>(`/settings/delivery-slots?date=${encodeURIComponent(key)}`)
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
