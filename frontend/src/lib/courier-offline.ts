import type { CourierOrder, PendingCourierAction } from './courier-types';

const ORDERS_CACHE_KEY = 'barakabox_courier_orders_cache_v1';
const PENDING_KEY = 'barakabox_courier_pending_actions_v1';

export function cacheCourierOrders(orders: CourierOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      ORDERS_CACHE_KEY,
      JSON.stringify({ at: Date.now(), orders }),
    );
  } catch {
    // ignore
  }
}

export function readCachedCourierOrders(): CourierOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { orders?: CourierOrder[] };
    return Array.isArray(parsed.orders) ? parsed.orders : [];
  } catch {
    return [];
  }
}

export function enqueuePendingAction(action: PendingCourierAction): void {
  if (typeof window === 'undefined') return;
  const list = readPendingActions();
  list.push({ ...action, at: Date.now() });
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

type StoredPending = PendingCourierAction & { at: number };

export function readPendingActions(): StoredPending[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPending[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePendingActions(actions: StoredPending[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(actions));
}
