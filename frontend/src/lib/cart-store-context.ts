'use client';

import { showToast } from '@/lib/toast';

const STORAGE_KEY = 'storefront:active-store:v1';

export type ActiveStoreContext = {
  storeId: string;
  storeName: string;
  storeSlug?: string;
};

export function getActiveStore(): ActiveStoreContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveStoreContext;
    if (!parsed?.storeId || !parsed?.storeName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveStore(store: ActiveStoreContext | null) {
  if (typeof window === 'undefined') return;
  if (!store) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function clearActiveStore() {
  setActiveStore(null);
}

/** One store per cart session until checkout (multi-store checkout in a later stage). */
export function assertCanAddFromStore(meta?: {
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
}): boolean {
  if (!meta?.storeId) return true;

  const active = getActiveStore();
  if (!active) {
    setActiveStore({
      storeId: meta.storeId,
      storeName: meta.storeName ?? 'Do‘kon',
      storeSlug: meta.storeSlug,
    });
    return true;
  }

  if (active.storeId === meta.storeId) return true;

  showToast({
    type: 'info',
    message: `Savatda “${active.storeName}” mahsulotlari bor. Avval shu buyurtmani yakunlang yoki savatni tozalang.`,
  });
  return false;
}
