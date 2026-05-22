import type { OrderStatusLite } from '@/lib/last-order-storage';
import type { DeliverySpeed } from '@/lib/delivery-pricing';
import { isActiveGuestOrderStatus, isCompletedGuestOrderStatus } from '@/lib/order-track';

const ACTIVE_STORAGE_KEY = 'barakabox_guest_orders_v3';
const LEGACY_V2_KEY = 'barakabox_guest_orders_v2';
const LEGACY_SESSION_KEY = 'barakabox_active_track_v1';
const COMPLETED_FLASH_KEY = 'barakabox_guest_completed_flash_v1';
const HISTORY_STORAGE_KEY = 'barakabox_guest_order_history_v1';

export const COMPLETED_FLASH_MS = 15_000;
const HISTORY_MAX = 10;

export type StoredGuestOrder = {
  trackingToken: string;
  orderNumber: string;
  /** @deprecated Same as orderNumber for legacy storage */
  trackingCode: string;
  status: OrderStatusLite;
  deliverySpeed: DeliverySpeed;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
  courierName?: string | null;
};

export type GuestCompletedFlash = {
  trackingCode: string;
  status: 'DELIVERED' | 'CANCELLED';
  completedAt: string;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
};

export type GuestOrderHistoryEntry = {
  orderNumber: string;
  /** @deprecated Use orderNumber */
  trackingCode: string;
  status: OrderStatusLite;
  completedAt: string;
};

type ActiveOrdersStore = {
  version: 3;
  selectedToken: string | null;
  orders: Record<string, StoredGuestOrder>;
};

type HistoryStore = {
  version: 1;
  entries: GuestOrderHistoryEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function emptyActiveStore(): ActiveOrdersStore {
  return { version: 3, selectedToken: null, orders: {} };
}

function readActiveStoreRaw(): ActiveOrdersStore {
  if (typeof window === 'undefined') return emptyActiveStore();
  try {
    const raw = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed) && parsed.version === 3 && isRecord(parsed.orders)) {
        return {
          version: 3,
          selectedToken: typeof parsed.selectedToken === 'string' ? parsed.selectedToken : null,
          orders: parsed.orders as Record<string, StoredGuestOrder>,
        };
      }
    }
    return migrateLegacyStores();
  } catch {
    return emptyActiveStore();
  }
}

function migrateLegacyStores(): ActiveOrdersStore {
  const store = emptyActiveStore();
  if (typeof window === 'undefined') return store;

  try {
    const v2 = window.localStorage.getItem(LEGACY_V2_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as { orders?: Record<string, StoredGuestOrder>; selectedToken?: string };
      const orders: Record<string, StoredGuestOrder> = {};
      for (const order of Object.values(parsed.orders ?? {})) {
        if (order?.trackingToken && isActiveGuestOrderStatus(order.status)) {
          orders[order.trackingToken] = order;
        }
      }
      let selectedToken = parsed.selectedToken ?? null;
      if (selectedToken && !orders[selectedToken]) selectedToken = null;
      window.localStorage.removeItem(LEGACY_V2_KEY);
      writeActiveStore({ version: 3, selectedToken, orders });
      return { version: 3, selectedToken, orders };
    }
  } catch {
    // ignore
  }

  try {
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }

  return store;
}

function writeActiveStore(store: ActiveOrdersStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('barakabox_guest_orders_changed'));
  } catch {
    // ignore quota
  }
}

function pruneActiveStore(store: ActiveOrdersStore): ActiveOrdersStore {
  const orders: Record<string, StoredGuestOrder> = {};
  for (const [token, order] of Object.entries(store.orders)) {
    if (!order?.trackingToken) continue;
    if (!isActiveGuestOrderStatus(order.status)) continue;
    orders[token] = order;
  }
  let selectedToken = store.selectedToken;
  if (selectedToken && !orders[selectedToken]) {
    selectedToken = Object.keys(orders)[0] ?? null;
  }
  return { version: 3, selectedToken, orders };
}

function normalizeStoredGuestOrder(order: StoredGuestOrder): StoredGuestOrder {
  const orderNumber = order.orderNumber || order.trackingCode || '';
  return { ...order, orderNumber, trackingCode: orderNumber };
}

export function listActiveGuestOrders(): StoredGuestOrder[] {
  const store = pruneActiveStore(readActiveStoreRaw());
  writeActiveStore(store);
  return Object.values(store.orders).map(normalizeStoredGuestOrder).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function getSelectedActiveGuestOrder(): StoredGuestOrder | null {
  const store = pruneActiveStore(readActiveStoreRaw());
  if (!store.selectedToken) return null;
  const order = store.orders[store.selectedToken];
  return order ? normalizeStoredGuestOrder(order) : null;
}

export function selectGuestOrder(trackingToken: string): void {
  const store = pruneActiveStore(readActiveStoreRaw());
  if (!store.orders[trackingToken]) return;
  writeActiveStore({ ...store, selectedToken: trackingToken });
}

export function removeActiveGuestOrder(trackingToken: string): void {
  const store = pruneActiveStore(readActiveStoreRaw());
  const orders = { ...store.orders };
  delete orders[trackingToken];
  const selectedToken =
    store.selectedToken === trackingToken ? Object.keys(orders)[0] ?? null : store.selectedToken;
  writeActiveStore({ version: 3, selectedToken, orders });
}

export function upsertActiveGuestOrderFromApi(input: {
  trackingToken: string;
  orderNumber: string;
  trackingCode?: string;
  status: OrderStatusLite;
  deliverySpeed: DeliverySpeed;
  createdAt: string;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
  courierName?: string | null;
}): StoredGuestOrder | null {
  if (isCompletedGuestOrderStatus(input.status)) {
    const orderNumber = input.orderNumber || input.trackingCode || '';
    finalizeGuestOrderCompletion({
      trackingToken: input.trackingToken,
      orderNumber,
      trackingCode: orderNumber,
      status: input.status,
      deliverySpeed: input.deliverySpeed,
      createdAt: input.createdAt,
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      cashbackEarnedTiyin: input.cashbackEarnedTiyin,
      cashbackCredited: input.cashbackCredited,
      courierName: input.courierName ?? null,
    });
    return null;
  }

  if (!isActiveGuestOrderStatus(input.status)) {
    return null;
  }

  const store = pruneActiveStore(readActiveStoreRaw());
  const now = new Date().toISOString();
  const prev = store.orders[input.trackingToken];
  const orderNumber = input.orderNumber || input.trackingCode || '';
  const next: StoredGuestOrder = {
    trackingToken: input.trackingToken,
    orderNumber,
    trackingCode: orderNumber,
    status: input.status,
    deliverySpeed: input.deliverySpeed,
    createdAt: prev?.createdAt ?? input.createdAt,
    updatedAt: now,
    syncedAt: now,
    cashbackEarnedTiyin: input.cashbackEarnedTiyin,
    cashbackCredited: input.cashbackCredited,
    courierName: input.courierName ?? null,
  };
  const orders = { ...store.orders, [input.trackingToken]: next };
  const selectedToken = store.selectedToken ?? input.trackingToken;
  writeActiveStore({ version: 3, selectedToken, orders });
  return next;
}

function readHistoryStore(): HistoryStore {
  if (typeof window === 'undefined') return { version: 1, entries: [] };
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return { version: 1, entries: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.entries)) {
      return { version: 1, entries: parsed.entries as GuestOrderHistoryEntry[] };
    }
  } catch {
    // ignore
  }
  return { version: 1, entries: [] };
}

function appendOrderHistory(entry: GuestOrderHistoryEntry): void {
  if (typeof window === 'undefined') return;
  const store = readHistoryStore();
  const entries = [entry, ...store.entries.filter((e) => e.trackingCode !== entry.trackingCode)].slice(
    0,
    HISTORY_MAX,
  );
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: 1, entries }));
  } catch {
    // ignore
  }
}

export function listGuestOrderHistory(): GuestOrderHistoryEntry[] {
  return readHistoryStore().entries;
}

export function finalizeGuestOrderCompletion(order: StoredGuestOrder): void {
  removeActiveGuestOrder(order.trackingToken);
  const flash: GuestCompletedFlash = {
    trackingCode: order.trackingCode,
    status: order.status === 'CANCELLED' ? 'CANCELLED' : 'DELIVERED',
    completedAt: new Date().toISOString(),
    cashbackEarnedTiyin: order.cashbackEarnedTiyin,
    cashbackCredited: order.cashbackCredited,
  };
  setCompletedFlash(flash);
  appendOrderHistory({
    orderNumber: order.orderNumber,
    trackingCode: order.orderNumber,
    status: order.status,
    completedAt: flash.completedAt,
  });
}

export function getCompletedFlash(): GuestCompletedFlash | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(COMPLETED_FLASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestCompletedFlash;
    if (!parsed?.completedAt || !parsed.trackingCode) return null;
    const age = Date.now() - Date.parse(parsed.completedAt);
    if (!Number.isFinite(age) || age > COMPLETED_FLASH_MS) {
      clearCompletedFlash();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCompletedFlash(flash: GuestCompletedFlash): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(COMPLETED_FLASH_KEY, JSON.stringify(flash));
    window.dispatchEvent(new Event('barakabox_guest_orders_changed'));
  } catch {
    // ignore
  }
}

export function clearCompletedFlash(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(COMPLETED_FLASH_KEY);
    window.dispatchEvent(new Event('barakabox_guest_orders_changed'));
  } catch {
    // ignore
  }
}

export function hasActiveGuestOrderTracking(): boolean {
  return listActiveGuestOrders().length > 0;
}

/** @deprecated Use hasActiveGuestOrderTracking */
export function hasVisibleGuestOrderTracking(): boolean {
  return hasActiveGuestOrderTracking();
}

export const guestOrdersChangedEvent = 'barakabox_guest_orders_changed';
