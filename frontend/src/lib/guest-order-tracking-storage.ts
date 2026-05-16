import type { OrderStatusLite } from '@/lib/last-order-storage';
import type { DeliverySpeed } from '@/lib/delivery-pricing';
import { isTrackableOrderStatus } from '@/lib/order-track';

const STORAGE_KEY = 'barakabox_guest_orders_v2';
const LEGACY_SESSION_KEY = 'barakabox_active_track_v1';
export const COMPLETED_ORDER_RETENTION_MS = 24 * 60 * 60 * 1000;

export type StoredGuestOrder = {
  trackingToken: string;
  trackingCode: string;
  status: OrderStatusLite;
  deliverySpeed: DeliverySpeed;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
  completedAt?: string;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
  courierName?: string | null;
};

type GuestOrdersStore = {
  version: 2;
  selectedToken: string | null;
  orders: Record<string, StoredGuestOrder>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStatus(value: unknown): OrderStatusLite {
  const s = String(value ?? '').toUpperCase();
  if (
    s === 'NEW' ||
    s === 'PICKING' ||
    s === 'READY' ||
    s === 'DELIVERING' ||
    s === 'DELIVERED' ||
    s === 'CANCELLED'
  ) {
    return s;
  }
  return 'NEW';
}

function parseDeliverySpeed(value: unknown): DeliverySpeed {
  return value === 'EXPRESS' ? 'EXPRESS' : 'STANDARD';
}

function emptyStore(): GuestOrdersStore {
  return { version: 2, selectedToken: null, orders: {} };
}

function readStore(): GuestOrdersStore {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacySessionStore();
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 2 || !isRecord(parsed.orders)) {
      return emptyStore();
    }
    return {
      version: 2,
      selectedToken: typeof parsed.selectedToken === 'string' ? parsed.selectedToken : null,
      orders: parsed.orders as Record<string, StoredGuestOrder>,
    };
  } catch {
    return emptyStore();
  }
}

function migrateLegacySessionStore(): GuestOrdersStore {
  const store = emptyStore();
  try {
    const legacy = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return store;
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    return store;
  }
  return store;
}

function writeStore(store: GuestOrdersStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('barakabox_guest_orders_changed'));
  } catch {
    // ignore quota
  }
}

export function pruneGuestOrderStore(store: GuestOrdersStore): GuestOrdersStore {
  const now = Date.now();
  const orders: Record<string, StoredGuestOrder> = {};
  for (const [token, order] of Object.entries(store.orders)) {
    if (!order?.trackingToken) continue;
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      const completedAt = order.completedAt ? Date.parse(order.completedAt) : Date.parse(order.updatedAt);
      if (Number.isFinite(completedAt) && now - completedAt > COMPLETED_ORDER_RETENTION_MS) {
        continue;
      }
    }
    orders[token] = order;
  }
  let selectedToken = store.selectedToken;
  if (selectedToken && !orders[selectedToken]) {
    selectedToken = null;
  }
  return { version: 2, selectedToken, orders };
}

export function listVisibleGuestOrders(): StoredGuestOrder[] {
  const store = pruneGuestOrderStore(readStore());
  writeStore(store);
  return Object.values(store.orders).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function getSelectedGuestOrder(): StoredGuestOrder | null {
  const store = pruneGuestOrderStore(readStore());
  if (!store.selectedToken) return null;
  return store.orders[store.selectedToken] ?? null;
}

export function selectGuestOrder(trackingToken: string): void {
  const store = pruneGuestOrderStore(readStore());
  if (!store.orders[trackingToken]) return;
  writeStore({ ...store, selectedToken: trackingToken });
}

export function upsertGuestOrderFromApi(input: {
  trackingToken: string;
  trackingCode: string;
  status: OrderStatusLite;
  deliverySpeed: DeliverySpeed;
  createdAt: string;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
  courierName?: string | null;
}): StoredGuestOrder {
  const store = pruneGuestOrderStore(readStore());
  const now = new Date().toISOString();
  const prev = store.orders[input.trackingToken];
  const terminal = input.status === 'DELIVERED' || input.status === 'CANCELLED';
  const next: StoredGuestOrder = {
    trackingToken: input.trackingToken,
    trackingCode: input.trackingCode,
    status: input.status,
    deliverySpeed: input.deliverySpeed,
    createdAt: prev?.createdAt ?? input.createdAt,
    updatedAt: now,
    syncedAt: now,
    completedAt: terminal ? prev?.completedAt ?? now : undefined,
    cashbackEarnedTiyin: input.cashbackEarnedTiyin,
    cashbackCredited: input.cashbackCredited,
    courierName: input.courierName ?? null,
  };
  const orders = { ...store.orders, [input.trackingToken]: next };
  const selectedToken = store.selectedToken ?? input.trackingToken;
  writeStore({ version: 2, selectedToken, orders });
  return next;
}

export function removeGuestOrder(trackingToken: string): void {
  const store = pruneGuestOrderStore(readStore());
  const orders = { ...store.orders };
  delete orders[trackingToken];
  const selectedToken =
    store.selectedToken === trackingToken
      ? Object.keys(orders)[0] ?? null
      : store.selectedToken;
  writeStore({ version: 2, selectedToken, orders });
}

export function hasActiveGuestOrderTracking(): boolean {
  return listVisibleGuestOrders().some((o) => isTrackableOrderStatus(o.status));
}

export function hasVisibleGuestOrderTracking(): boolean {
  return listVisibleGuestOrders().length > 0;
}

export const guestOrdersChangedEvent = 'barakabox_guest_orders_changed';
