import type { PickerOrder } from './picker-types';

const ORDERS_KEY = 'barakabox_picker_orders_cache_v1';
const PENDING_KEY = 'barakabox_picker_pending_v1';

export type PendingPickerAction =
  | { type: 'start'; orderId: string }
  | { type: 'ready'; orderId: string };

export function cachePickerOrders(orders: PickerOrder[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function readCachedPickerOrders(): PickerOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PickerOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readPendingActions(): PendingPickerAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingPickerAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePendingActions(actions: PendingPickerAction[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(actions));
}

export function enqueuePendingAction(action: PendingPickerAction): void {
  const list = readPendingActions();
  list.push(action);
  writePendingActions(list);
}
