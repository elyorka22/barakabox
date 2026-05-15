import type { CourierDayStats, CourierHistoryEntry, CourierOrder } from './courier-types';

const ONLINE_KEY = 'barakabox_courier_online_v1';
const STATS_KEY = 'barakabox_courier_stats_v1';
const HISTORY_KEY = 'barakabox_courier_history_v1';
const SESSION_KEY = 'barakabox_courier_session_start_v1';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyStats(): CourierDayStats {
  return {
    dateKey: todayKey(),
    deliveriesCount: 0,
    earningsSoM: 0,
    completedOrders: 0,
    onlineSeconds: 0,
  };
}

export function readCourierOnline(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(ONLINE_KEY);
    if (raw === '0') return false;
    return true;
  } catch {
    return true;
  }
}

export const COURIER_ONLINE_CHANGED = 'barakabox_courier_online_changed';

export function writeCourierOnline(online: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ONLINE_KEY, online ? '1' : '0');
  if (online) {
    window.localStorage.setItem(SESSION_KEY, String(Date.now()));
  }
  window.dispatchEvent(new Event(COURIER_ONLINE_CHANGED));
}

export function readCourierStats(): CourierDayStats {
  if (typeof window === 'undefined') return emptyStats();
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as CourierDayStats;
    if (parsed.dateKey !== todayKey()) return emptyStats();
    return parsed;
  } catch {
    return emptyStats();
  }
}

export function writeCourierStats(stats: CourierDayStats): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordCourierDelivery(order: CourierOrder): CourierDayStats {
  const stats = readCourierStats();
  const amount = Number(order.totalAmount) || 0;
  const next: CourierDayStats = {
    ...stats,
    dateKey: todayKey(),
    deliveriesCount: stats.deliveriesCount + 1,
    completedOrders: stats.completedOrders + 1,
    earningsSoM: stats.earningsSoM + Math.round(amount * 0.08),
  };
  writeCourierStats(next);
  appendCourierHistory(order);
  return next;
}

export function tickCourierOnlineSeconds(deltaSec: number): CourierDayStats {
  const stats = readCourierStats();
  const next: CourierDayStats = {
    ...stats,
    dateKey: todayKey(),
    onlineSeconds: stats.onlineSeconds + deltaSec,
  };
  writeCourierStats(next);
  return next;
}

export function readCourierHistory(): CourierHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CourierHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendCourierHistory(order: CourierOrder): void {
  const list = readCourierHistory();
  const entry: CourierHistoryEntry = {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress || order.formattedAddress || '—',
    totalAmount: Number(order.totalAmount) || 0,
    deliveredAt: new Date().toISOString(),
  };
  const next = [entry, ...list.filter((h) => h.id !== order.id)].slice(0, 50);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function formatOnlineDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}daq`;
  return `${m} daq`;
}
