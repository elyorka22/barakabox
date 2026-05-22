import { pickerOrderLabel, orderDeliveryFeeLabel } from './picker-order-utils';
import type { PickerDayStats, PickerHistoryEntry, PickerOrder } from './picker-types';

const ONLINE_KEY = 'barakabox_picker_online_v1';
const STATS_KEY = 'barakabox_picker_stats_v1';
const HISTORY_KEY = 'barakabox_picker_history_v1';
const SESSION_KEY = 'barakabox_picker_session_start_v1';
const CHECKLIST_PREFIX = 'barakabox_picker_check_v1_';
const SKIPPED_KEY = 'barakabox_picker_skipped_v1';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyStats(): PickerDayStats {
  return {
    dateKey: todayKey(),
    queuedNow: 0,
    pickedToday: 0,
    avgPickMinutes: 0,
    onlineSeconds: 0,
    cancelledItems: 0,
  };
}

export const PICKER_ONLINE_CHANGED = 'barakabox_picker_online_changed';

export function readPickerOnline(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(ONLINE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writePickerOnline(online: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ONLINE_KEY, online ? '1' : '0');
  if (online) window.localStorage.setItem(SESSION_KEY, String(Date.now()));
  window.dispatchEvent(new Event(PICKER_ONLINE_CHANGED));
}

export function readPickerStats(): PickerDayStats {
  if (typeof window === 'undefined') return emptyStats();
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as PickerDayStats;
    if (parsed.dateKey !== todayKey()) return emptyStats();
    return parsed;
  } catch {
    return emptyStats();
  }
}

export function writePickerStats(stats: PickerDayStats): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function tickPickerOnlineSeconds(deltaSec: number): PickerDayStats {
  const stats = readPickerStats();
  const next = { ...stats, dateKey: todayKey(), onlineSeconds: stats.onlineSeconds + deltaSec };
  writePickerStats(next);
  return next;
}

export function readPickerHistory(): PickerHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      PickerHistoryEntry & { customerName?: string; deliveryType?: string }
    >;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
      id: row.id,
      orderLabel: row.orderLabel ?? pickerOrderLabel({ id: row.id }),
      deliveryLabel:
        row.deliveryLabel ??
        (row.deliveryType === 'tezkor' ? 'Tezkor' : row.deliveryType === 'oddiy' ? 'Oddiy' : 'Yetkazish'),
      itemCount: row.itemCount ?? 0,
      completedAt: row.completedAt,
      pickingMinutes: row.pickingMinutes ?? 0,
    }));
  } catch {
    return [];
  }
}

export function appendPickerHistory(order: PickerOrder, pickingMinutes: number): void {
  if (typeof window === 'undefined') return;
  const list = readPickerHistory();
  const entry: PickerHistoryEntry = {
    id: order.id,
    orderLabel: pickerOrderLabel(order),
    deliveryLabel: orderDeliveryFeeLabel(order),
    itemCount: order.items.length,
    completedAt: new Date().toISOString(),
    pickingMinutes,
  };
  const next = [entry, ...list.filter((h) => h.id !== order.id)].slice(0, 100);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));

  const stats = readPickerStats();
  const picked = stats.pickedToday + 1;
  const avg =
    picked === 1
      ? pickingMinutes
      : Math.round(((stats.avgPickMinutes * (picked - 1) + pickingMinutes) / picked) * 10) / 10;
  writePickerStats({
    ...stats,
    dateKey: todayKey(),
    pickedToday: picked,
    avgPickMinutes: avg,
  });
}

export function recordPickerNotFoundItem(): void {
  const stats = readPickerStats();
  writePickerStats({
    ...stats,
    dateKey: todayKey(),
    cancelledItems: stats.cancelledItems + 1,
  });
}

export function updateQueuedCount(count: number): void {
  const stats = readPickerStats();
  writePickerStats({ ...stats, dateKey: todayKey(), queuedNow: count });
}

export function readSkippedOrderIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SKIPPED_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function addSkippedOrderId(orderId: string): void {
  if (typeof window === 'undefined') return;
  const set = readSkippedOrderIds();
  set.add(orderId);
  window.localStorage.setItem(SKIPPED_KEY, JSON.stringify([...set]));
}

export function readChecklist(orderId: string): { checkedIds: string[]; notFoundIds: string[] } {
  if (typeof window === 'undefined') return { checkedIds: [], notFoundIds: [] };
  try {
    const raw = window.localStorage.getItem(`${CHECKLIST_PREFIX}${orderId}`);
    if (!raw) return { checkedIds: [], notFoundIds: [] };
    return JSON.parse(raw) as { checkedIds: string[]; notFoundIds: string[] };
  } catch {
    return { checkedIds: [], notFoundIds: [] };
  }
}

export function writeChecklist(orderId: string, state: { checkedIds: string[]; notFoundIds: string[] }): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${CHECKLIST_PREFIX}${orderId}`, JSON.stringify(state));
}

export function clearChecklist(orderId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${CHECKLIST_PREFIX}${orderId}`);
}

export function formatPickerDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}daq`;
  return `${m} daq`;
}

export function readSessionStartMs(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
