'use client';

import { useSyncExternalStore } from 'react';
import {
  getCartHydrated,
  getCartItems,
  getCartTotalCount,
  getVariantPending,
  getVariantQuantity,
  subscribeCart,
  type CartItem,
} from './cart-store';

function emptySnapshot(): CartItem[] {
  return [];
}

export function useCartQuantity(variantId: string | null | undefined): number {
  return useSyncExternalStore(
    subscribeCart,
    () => getVariantQuantity(variantId),
    () => 0,
  );
}

export function useCartPending(variantId: string | null | undefined): boolean {
  return useSyncExternalStore(
    subscribeCart,
    () => getVariantPending(variantId),
    () => false,
  );
}

export function useCartItems(): CartItem[] {
  return useSyncExternalStore(subscribeCart, getCartItems, emptySnapshot);
}

export function useCartTotalCount(): number {
  return useSyncExternalStore(
    subscribeCart,
    getCartTotalCount,
    () => 0,
  );
}

export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    subscribeCart,
    getCartHydrated,
    () => false,
  );
}
