'use client';

import {
  getSellingModeDecreaseDelta,
  getSellingModeMin,
  getSellingModeStep,
  type SellingMode,
} from '@onlinebozor/product-units';
import { api, authStorage, authEvents, isApiError } from './api';
import { t } from './i18n';
import { showToast } from './toast';

export type CartItem = {
  id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: string;
    unit?: string | null;
    unitType?: string | null;
    sellingMode?: string | null;
    cashbackType?: string | null;
    cashbackValue?: number | null;
  } | null;
  variant?: {
    id: string;
    flavor?: string | null;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    price: number;
    discountPrice?: number | null;
    product?: {
      id: string;
      name: string;
      unit?: string | null;
      unitType?: string | null;
      sellingMode?: string | null;
      cashbackType?: string | null;
      cashbackValue?: number | null;
    } | null;
  } | null;
  box?: {
    id: string;
    name: string;
    price: string;
  } | null;
};

type CartResponse = { items: CartItem[] };

type CartStoreState = {
  items: CartItem[];
  serverByVariant: Record<string, number>;
  pendingByVariant: Record<string, number>;
  inFlightByVariant: Record<string, number>;
  productIdByVariant: Record<string, string>;
  hydrated: boolean;
};

type Listener = () => void;

const STORAGE_KEY = 'barakabox_cart_snapshot_v1';
const FLUSH_DEBOUNCE_MS = 100;
const MAX_FLUSH_ATTEMPTS = 6;
const RETRY_BASE_MS = 80;
const PERSIST_DEBOUNCE_MS = 500;

type EmitOptions = {
  /** Variant ids that changed quantity (pending/server/inFlight). */
  variantIds?: Iterable<string>;
  /** Notify cart page, badge, and other global subscribers. */
  notifyGlobal?: boolean;
};

let state: CartStoreState = {
  items: [],
  serverByVariant: {},
  pendingByVariant: {},
  inFlightByVariant: {},
  productIdByVariant: {},
  hydrated: false,
};

const globalListeners = new Set<Listener>();
const variantListeners = new Map<string, Set<Listener>>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let bootstrapPromise: Promise<void> | null = null;
let lastRollbackToastAt = 0;

function collectChangedVariantIds(
  prev: Record<string, number>,
  next: Record<string, number>,
): Set<string> {
  const touched = new Set<string>();
  for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if ((prev[id] ?? 0) !== (next[id] ?? 0)) touched.add(id);
  }
  return touched;
}

function emitVariant(variantId: string) {
  const subs = variantListeners.get(variantId);
  if (!subs) return;
  for (const listener of Array.from(subs)) listener();
}

function emitVariants(variantIds: Iterable<string>) {
  for (const variantId of variantIds) emitVariant(variantId);
}

function emitGlobal() {
  for (const listener of Array.from(globalListeners)) listener();
}

function emit(options: EmitOptions = {}) {
  if (options.variantIds) emitVariants(options.variantIds);
  if (options.notifyGlobal) emitGlobal();
  schedulePersist();
}

function deriveServer(items: CartItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (item.variant?.id) {
      map[item.variant.id] = (map[item.variant.id] ?? 0) + item.quantity;
    }
  }
  return map;
}

function setState(patch: Partial<CartStoreState>, emitOptions: EmitOptions = {}) {
  state = { ...state, ...patch };
  emit(emitOptions);
}

function applyCartItemsSnapshot(items: CartItem[], extraVariantIds: string[] = []) {
  const prevServer = state.serverByVariant;
  const nextServer = deriveServer(items);
  const changed = collectChangedVariantIds(prevServer, nextServer);
  for (const id of extraVariantIds) changed.add(id);

  setState(
    {
      items,
      serverByVariant: nextServer,
      productIdByVariant: rememberVariantProduct(items, state.productIdByVariant),
      hydrated: true,
    },
    { variantIds: changed, notifyGlobal: true },
  );
}

function loadFromStorage(): { items: CartItem[]; productIdByVariant: Record<string, string> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      items?: CartItem[];
      productIdByVariant?: Record<string, string>;
    };
    if (!parsed.items || !Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items,
      productIdByVariant: parsed.productIdByVariant ?? {},
    };
  } catch {
    return null;
  }
}

function schedulePersist() {
  if (typeof window === 'undefined') return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: state.items,
          productIdByVariant: state.productIdByVariant,
        }),
      );
    } catch {
      // Ignore quota issues silently.
    }
  }, PERSIST_DEBOUNCE_MS);
}

function rememberVariantProduct(items: CartItem[], current: Record<string, string>) {
  const next: Record<string, string> = { ...current };
  for (const item of items) {
    const variantId = item.variant?.id;
    const productId = item.product?.id ?? item.variant?.product?.id;
    if (variantId && productId) {
      next[variantId] = productId;
    }
  }
  return next;
}

function applyServerSnapshot(payload: CartResponse | null) {
  applyCartItemsSnapshot(payload?.items ?? []);
}

async function fetchAndApply() {
  try {
    const token = authStorage.getAccessToken();
    const data = await api.get<CartResponse>('/cart', token, true);
    applyServerSnapshot(data);
  } catch {
    applyServerSnapshot({ items: [] });
  }
}

export function getCartSnapshot(): CartStoreState {
  return state;
}

/** Subscribe to cart-wide changes (nav badge, cart page). */
export function subscribeCart(listener: Listener): () => void {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
}

/** Subscribe to a single variant quantity — avoids grid-wide rerenders. */
export function subscribeCartVariant(variantId: string | null | undefined, listener: Listener): () => void {
  if (!variantId) return () => undefined;
  let subs = variantListeners.get(variantId);
  if (!subs) {
    subs = new Set();
    variantListeners.set(variantId, subs);
  }
  subs.add(listener);
  return () => {
    subs?.delete(listener);
    if (subs && subs.size === 0) variantListeners.delete(variantId);
  };
}

export function bootstrapCart(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;

  if (!state.hydrated) {
    const cached = loadFromStorage();
    if (cached) {
      setState(
        {
          items: cached.items,
          serverByVariant: deriveServer(cached.items),
          productIdByVariant: cached.productIdByVariant,
          hydrated: true,
        },
        { notifyGlobal: true, variantIds: Object.keys(deriveServer(cached.items)) },
      );
    }
  }

  bootstrapPromise = (async () => {
    try {
      await fetchAndApply();
    } finally {
      bootstrapPromise = null;
    }
  })();
  return bootstrapPromise;
}

export function getVariantQuantity(variantId: string | null | undefined): number {
  if (!variantId) return 0;
  const server = state.serverByVariant[variantId] ?? 0;
  const inFlight = state.inFlightByVariant[variantId] ?? 0;
  const pending = state.pendingByVariant[variantId] ?? 0;
  return Math.max(0, server + inFlight + pending);
}

export function getVariantPending(variantId: string | null | undefined): boolean {
  if (!variantId) return false;
  const inFlight = state.inFlightByVariant[variantId] ?? 0;
  const pending = state.pendingByVariant[variantId] ?? 0;
  return inFlight !== 0 || pending !== 0;
}

export function getCartItems(): CartItem[] {
  return state.items;
}

export function getCartTotalCount(): number {
  const seen = new Set<string>();
  let lines = 0;
  for (const item of state.items) {
    const variantId = item.variant?.id;
    if (!variantId) continue;
    const qty = getVariantQuantity(variantId);
    if (qty > 0 && !seen.has(variantId)) {
      seen.add(variantId);
      lines += 1;
    }
  }
  for (const variantId of Object.keys(state.pendingByVariant)) {
    const qty = getVariantQuantity(variantId);
    if (qty > 0 && !seen.has(variantId)) {
      seen.add(variantId);
      lines += 1;
    }
  }
  for (const variantId of Object.keys(state.inFlightByVariant)) {
    const qty = getVariantQuantity(variantId);
    if (qty > 0 && !seen.has(variantId)) {
      seen.add(variantId);
      lines += 1;
    }
  }
  return lines;
}

export function getCartHydrated(): boolean {
  return state.hydrated;
}

function clearFlushTimer(variantId: string) {
  const timer = flushTimers.get(variantId);
  if (timer) {
    clearTimeout(timer);
    flushTimers.delete(variantId);
  }
}

function scheduleFlush(variantId: string) {
  clearFlushTimer(variantId);
  const timer = setTimeout(() => {
    flushTimers.delete(variantId);
    void flushVariant(variantId, 0);
  }, FLUSH_DEBOUNCE_MS);
  flushTimers.set(variantId, timer);
}

function scheduleFlushRetry(variantId: string, attempt: number) {
  clearFlushTimer(variantId);
  const delay = Math.min(500, RETRY_BASE_MS + attempt * 120);
  const timer = setTimeout(() => {
    flushTimers.delete(variantId);
    void flushVariant(variantId, attempt);
  }, delay);
  flushTimers.set(variantId, timer);
}

async function flushVariant(variantId: string, attempt = 0) {
  if (state.inFlightByVariant[variantId]) {
    scheduleFlush(variantId);
    return;
  }
  const pending = state.pendingByVariant[variantId] ?? 0;
  if (pending === 0) return;

  const productId = state.productIdByVariant[variantId];
  if (!productId) {
    const nextPending = { ...state.pendingByVariant };
    delete nextPending[variantId];
    setState({ pendingByVariant: nextPending }, { variantIds: [variantId] });
    return;
  }

  const nextPending = { ...state.pendingByVariant };
  delete nextPending[variantId];
  const nextInFlight = { ...state.inFlightByVariant, [variantId]: pending };
  setState(
    { pendingByVariant: nextPending, inFlightByVariant: nextInFlight },
    { variantIds: [variantId] },
  );

  try {
    const token = authStorage.getAccessToken();
    const updated = await api.post<CartResponse>(
      '/cart/items',
      { productId, variantId, quantity: pending },
      token,
    );
    const cleanedInFlight = { ...state.inFlightByVariant };
    delete cleanedInFlight[variantId];
    state = { ...state, inFlightByVariant: cleanedInFlight };
    applyCartItemsSnapshot(updated?.items ?? [], [variantId]);
  } catch (err) {
    const cleanedInFlight = { ...state.inFlightByVariant };
    delete cleanedInFlight[variantId];
    const rateLimited = isApiError(err) && err.status === 429;

    if (rateLimited && attempt < MAX_FLUSH_ATTEMPTS) {
      const restoredPending = (state.pendingByVariant[variantId] ?? 0) + pending;
      setState(
        {
          inFlightByVariant: cleanedInFlight,
          pendingByVariant: { ...state.pendingByVariant, [variantId]: restoredPending },
        },
        { variantIds: [variantId] },
      );
      scheduleFlushRetry(variantId, attempt + 1);
      return;
    }

    const rollbackPending = (state.pendingByVariant[variantId] ?? 0) + pending;
    const nextPendingRollback = { ...state.pendingByVariant, [variantId]: rollbackPending };
    setState(
      { inFlightByVariant: cleanedInFlight, pendingByVariant: nextPendingRollback },
      { variantIds: [variantId] },
    );

    const now = Date.now();
    if (now - lastRollbackToastAt > 1500) {
      lastRollbackToastAt = now;
      const message = rateLimited
        ? t('common.rateLimited')
        : err instanceof Error && err.message
          ? err.message
          : "Savatni yangilab bo'lmadi. Internetni tekshirib qayta urinib ko'ring.";
      showToast({
        type: rateLimited ? 'info' : 'error',
        message,
      });
    }
  }

  if ((state.pendingByVariant[variantId] ?? 0) !== 0) {
    scheduleFlush(variantId);
  }
}

export function adjustCart(
  variantId: string,
  productId: string,
  sellingMode: SellingMode,
  action: 'add' | 'increase' | 'decrease',
): void {
  if (!variantId || !productId) return;
  const current = getVariantQuantity(variantId);
  let delta: number;
  if (action === 'add') {
    delta = current > 0 ? getSellingModeStep(sellingMode) : getSellingModeMin(sellingMode);
  } else if (action === 'increase') {
    delta = getSellingModeStep(sellingMode);
  } else {
    delta = getSellingModeDecreaseDelta(current, sellingMode);
  }
  incrementCart(variantId, productId, delta);
}

export function incrementCart(
  variantId: string,
  productId: string,
  delta: number,
): void {
  if (!variantId || !productId || !delta) return;

  const server = state.serverByVariant[variantId] ?? 0;
  const inFlight = state.inFlightByVariant[variantId] ?? 0;
  const currentPending = state.pendingByVariant[variantId] ?? 0;
  const projected = server + inFlight + currentPending + delta;
  const safeDelta = projected < 0 ? -(server + inFlight + currentPending) : delta;
  if (safeDelta === 0) return;

  const nextPending = {
    ...state.pendingByVariant,
    [variantId]: currentPending + safeDelta,
  };
  if (nextPending[variantId] === 0) {
    delete nextPending[variantId];
  }

  setState(
    {
      pendingByVariant: nextPending,
      productIdByVariant: {
        ...state.productIdByVariant,
        [variantId]: productId,
      },
    },
    { variantIds: [variantId], notifyGlobal: true },
  );

  scheduleFlush(variantId);
}

export async function deleteCartLine(
  variantId: string | undefined,
  productId: string | undefined,
): Promise<void> {
  try {
    const token = authStorage.getAccessToken();
    const updated = await api.delete<CartResponse>(
      '/cart/items',
      { productId, variantId },
      token,
    );
    applyServerSnapshot(updated ?? { items: [] });
  } catch (err) {
    const rateLimited = isApiError(err) && err.status === 429;
    showToast({
      type: rateLimited ? 'info' : 'error',
      message: rateLimited
        ? t('common.rateLimited')
        : err instanceof Error && err.message
          ? err.message
          : "Mahsulotni savatdan olib bo'lmadi",
    });
  }
}

export async function refreshCart(): Promise<void> {
  await fetchAndApply();
}

if (typeof window !== 'undefined') {
  window.addEventListener(authEvents.changedEventName, () => {
    void fetchAndApply();
  });
}
