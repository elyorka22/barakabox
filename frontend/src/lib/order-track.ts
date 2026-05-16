import type { OrderStatusLite } from '@/lib/last-order-storage';
import {
  CUSTOMER_ORDER_STEPS,
  customerProgressStepIndex,
  type CustomerOrderStep,
  type CustomerOrderStepId,
} from '@/lib/order-status';

export const MANUAL_ADDRESS_MIN_LEN = 8;

export type OrderTrackSnapshot = {
  id: string;
  status: OrderStatusLite;
  createdAt: string;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
  courierName?: string | null;
};

export type OrderProgressStepId = CustomerOrderStepId;
export type OrderProgressStep = CustomerOrderStep;

export const ORDER_PROGRESS_STEPS = CUSTOMER_ORDER_STEPS;

export function isManualAddressValid(text: string): boolean {
  return text.trim().length >= MANUAL_ADDRESS_MIN_LEN;
}

export function looksLikeCoordinateLine(text: string): boolean {
  return /^\s*-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+\s*$/.test(text.trim());
}

export function activeProgressStepIndex(status: OrderStatusLite): number {
  return customerProgressStepIndex(status);
}

export function isTrackableOrderStatus(status: OrderStatusLite): boolean {
  return status !== 'CANCELLED' && status !== 'DELIVERED';
}

const ACTIVE_TRACK_KEY = 'barakabox_active_track_v1';

export function saveActiveOrderTrack(orderId: string, phoneDigits: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      ACTIVE_TRACK_KEY,
      JSON.stringify({ orderId, phone: phoneDigits }),
    );
  } catch {
    // ignore
  }
}

export function readActiveOrderTrack(): { orderId: string; phone: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_TRACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { orderId?: string; phone?: string };
    if (!parsed.orderId || !parsed.phone) return null;
    return { orderId: parsed.orderId, phone: parsed.phone };
  } catch {
    return null;
  }
}

export function clearActiveOrderTrack(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ACTIVE_TRACK_KEY);
  } catch {
    // ignore
  }
}
