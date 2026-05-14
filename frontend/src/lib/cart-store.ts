'use client';

import { api, authStorage, authEvents } from './api';
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
const FLUSH_DEBOUNCE_MS = 280;
const PERSIST_DEBOUNCE_MS = 500;

let state: CartStoreState = {
  items: [],
  serverByVariant: {},
  pendingByVariant: {},
  inFlightByVariant: {},
  productIdByVariant: {},
  hydrated: false,
};

const listeners = new Set<Listener>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let bootstrapPromise: Promise<void> | null = null;
let lastRollbackToastAt = 0;

function emit() {
  for (const listener of Array.from(listeners)) {
    listener();
  }
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

function setState(patch: Partial<CartStoreState>) {
  state = { ...state, ...patch };
  emit();
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
  const items = payload?.items ?? [];
  setState({
    items,
    serverByVariant: deriveServer(items),
    productIdByVariant: rememberVariantProduct(items, state.productIdByVariant),
    hydrated: true,
  });
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

export function subscribeCart(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bootstrapCart(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;

  if (!state.hydrated) {
    const cached = loadFromStorage();
    if (cached) {
      setState({
        items: cached.items,
        serverByVariant: deriveServer(cached.items),
        productIdByVariant: cached.productIdByVariant,
        hydrated: true,
      });
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
  let total = 0;
  for (const item of state.items) {
    total += item.quantity;
  }
  for (const variantId of Object.keys(state.pendingByVariant)) {
    total += state.pendingByVariant[variantId] ?? 0;
  }
  for (const variantId of Object.keys(state.inFlightByVariant)) {
    total += state.inFlightByVariant[variantId] ?? 0;
  }
  return Math.max(0, total);
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
    void flushVariant(variantId);
  }, FLUSH_DEBOUNCE_MS);
  flushTimers.set(variantId, timer);
}

async function flushVariant(variantId: string) {
  if (state.inFlightByVariant[variantId]) {
    scheduleFlush(variantId);
    return;
  }
  const pending = state.pendingByVariant[variantId] ?? 0;
  if (pending === 0) return;

  const productId = state.productIdByVariant[variantId];
  if (!productId) {
    setState({
      pendingByVariant: { ...state.pendingByVariant, [variantId]: 0 },
    });
    return;
  }

  const nextPending = { ...state.pendingByVariant };
  delete nextPending[variantId];
  const nextInFlight = { ...state.inFlightByVariant, [variantId]: pending };
  setState({ pendingByVariant: nextPending, inFlightByVariant: nextInFlight });

  try {
    const token = authStorage.getAccessToken();
    const updated = await api.post<CartResponse>(
      '/cart/items',
      { productId, variantId, quantity: pending },
      token,
    );
    const items = updated?.items ?? [];
    const cleanedInFlight = { ...state.inFlightByVariant };
    delete cleanedInFlight[variantId];
    setState({
      items,
      serverByVariant: deriveServer(items),
      productIdByVariant: rememberVariantProduct(items, state.productIdByVariant),
      inFlightByVariant: cleanedInFlight,
      hydrated: true,
    });
  } catch (err) {
    const cleanedInFlight = { ...state.inFlightByVariant };
    delete cleanedInFlight[variantId];
    setState({ inFlightByVariant: cleanedInFlight });
    const now = Date.now();
    if (now - lastRollbackToastAt > 1500) {
      lastRollbackToastAt = now;
      showToast({
        type: 'error',
        message:
          err instanceof Error && err.message
            ? err.message
            : "Savatni yangilab bo'lmadi. Internetni tekshirib qayta urinib ko'ring.",
      });
    }
  }

  if ((state.pendingByVariant[variantId] ?? 0) !== 0) {
    scheduleFlush(variantId);
  }
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

  setState({
    pendingByVariant: nextPending,
    productIdByVariant: {
      ...state.productIdByVariant,
      [variantId]: productId,
    },
  });

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
    showToast({
      type: 'error',
      message:
        err instanceof Error && err.message
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
