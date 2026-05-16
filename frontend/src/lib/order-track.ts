import type { OrderStatusLite } from '@/lib/last-order-storage';
import type { DeliverySpeed } from '@/lib/delivery-pricing';
import {
  CUSTOMER_ORDER_STEPS,
  customerProgressStepIndex,
  isActiveCustomerOrder,
  type CustomerOrderStep,
  type CustomerOrderStepId,
} from '@/lib/order-status';

export const MANUAL_ADDRESS_MIN_LEN = 8;
export const GUEST_TRACK_POLL_MS = 20_000;

export type PublicOrderTrackSnapshot = {
  trackingToken: string;
  trackingCode: string;
  status: OrderStatusLite;
  createdAt: string;
  deliverySpeed: DeliverySpeed;
  cashbackEarnedTiyin: number;
  cashbackCredited: boolean;
  courierName?: string | null;
};

/** @deprecated Use PublicOrderTrackSnapshot */
export type OrderTrackSnapshot = PublicOrderTrackSnapshot & { id?: string };

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

/** Active guest tracking: accepted → courier → in delivery (DB: NEW…DELIVERING). */
export function isActiveGuestOrderStatus(status: OrderStatusLite): boolean {
  return isActiveCustomerOrder(status);
}

export function isCompletedGuestOrderStatus(status: OrderStatusLite): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

/** @deprecated Use isActiveGuestOrderStatus */
export function isTrackableOrderStatus(status: OrderStatusLite): boolean {
  return isActiveGuestOrderStatus(status);
}

export function parsePublicTrackStatus(value: string): OrderStatusLite {
  const s = value.toUpperCase();
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
