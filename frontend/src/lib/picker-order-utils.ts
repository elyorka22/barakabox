import { EXPRESS_DELIVERY_FEE } from './delivery-pricing';
import type { PickerDeliveryType, PickerOrder } from './picker-types';

export function internalOrderLabel(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

export function orderDeliveryType(order: PickerOrder): PickerDeliveryType {
  const fee = Number(order.deliveryFee ?? 0);
  if (fee >= EXPRESS_DELIVERY_FEE - 500) return 'tezkor';
  return 'oddiy';
}

export function deliveryTypeLabel(type: PickerDeliveryType): string {
  return type === 'tezkor' ? 'Tezkor' : 'Oddiy';
}

export function sortPickerOrders(orders: PickerOrder[]): PickerOrder[] {
  return [...orders].sort((a, b) => {
    const ta = orderDeliveryType(a) === 'tezkor' ? 1 : 0;
    const tb = orderDeliveryType(b) === 'tezkor' ? 1 : 0;
    if (tb !== ta) return tb - ta;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function estimatePickMinutes(order: PickerOrder): number {
  return 3 + order.items.length * 2;
}

export function minutesSinceCreated(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

export function formatOrderTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function statusLabelUz(status: string): string {
  if (status === 'NEW') return 'Navbatda';
  if (status === 'PICKING') return 'Qabul qilindi';
  if (status === 'READY') return 'Kuryerga tayyor';
  return status;
}

export function playNewOrderAlert(): void {
  if (typeof window === 'undefined') return;
  try {
    if ('vibrate' in navigator) navigator.vibrate([120, 60, 120]);
  } catch {
    /* ignore */
  }
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    void ctx.close();
  } catch {
    /* ignore */
  }
}

export function itemImageUrl(item: PickerOrder['items'][0]): string | null {
  return item.variant?.imageUrl || item.product?.imageUrl || null;
}
