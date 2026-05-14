/** Client-side delivery math — keep in sync with backend `orders.service` + env. */

export const FREE_DELIVERY_THRESHOLD = Number(process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD ?? 30000);
export const STANDARD_DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE ?? 3000);
export const EXPRESS_DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_EXPRESS_DELIVERY_FEE ?? 15000);

export type DeliverySpeed = 'STANDARD' | 'EXPRESS';

export function deliveryFeeFor(speed: DeliverySpeed, subtotal: number): number {
  if (speed === 'EXPRESS') return EXPRESS_DELIVERY_FEE;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
}

export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}
