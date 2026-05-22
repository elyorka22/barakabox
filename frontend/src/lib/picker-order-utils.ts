import { displayOrderNumber, formatOrderNumberLabel } from '@/lib/order-number';
import { formatMoneyUz } from './format';
import type { PickerOrder } from './picker-types';

/** @deprecated Use formatOrderNumberLabel(order.orderNumber) */
export function internalOrderLabel(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

export function pickerOrderLabel(order: Pick<PickerOrder, 'orderNumber' | 'id'>): string {
  return displayOrderNumber(order);
}

export function pickerOrderLabelFormatted(order: Pick<PickerOrder, 'orderNumber' | 'id'>): string {
  return formatOrderNumberLabel(pickerOrderLabel(order));
}

export function orderDeliveryFeeLabel(order: PickerOrder): string {
  const fee = Number(order.deliveryFee ?? 0);
  return fee === 0 ? 'Bepul yetkazish' : `Yetkazish: ${formatMoneyUz(fee)}`;
}

/** Priority sort: picking → imminent scheduled → new → future scheduled (FIFO within tier). */
export function sortPickerOrders(orders: PickerOrder[], prepLeadMinutes = 60): PickerOrder[] {
  const prepLeadMs = prepLeadMinutes * 60_000;
  const now = Date.now();

  const priority = (order: PickerOrder): number => {
    if (order.status === 'PICKING') return 0;
    if (order.status === 'PENDING_SCHEDULE') {
      const start = order.scheduledAt ? new Date(order.scheduledAt).getTime() : now + 86_400_000;
      const until = start - now;
      if (until <= prepLeadMs) return 20 + until / 60_000;
      return 300 + until / 60_000;
    }
    if (order.status === 'NEW') {
      return 120 + (now - new Date(order.createdAt).getTime()) / 60_000;
    }
    return 900;
  };

  return [...orders].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    if (a.status === 'PENDING_SCHEDULE' && b.status === 'PENDING_SCHEDULE') {
      const sa = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const sb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      if (sa !== sb) return sa - sb;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function msUntilScheduled(order: PickerOrder): number | null {
  if (!order.scheduledAt) return null;
  return new Date(order.scheduledAt).getTime() - Date.now();
}

export function formatScheduledCountdown(ms: number | null): string {
  if (ms === null) return '—';
  if (ms <= 0) return 'Tez orada';
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} soat ${m} daq`;
  return `${m} daq`;
}

export function isScheduledOrder(order: PickerOrder): boolean {
  return order.status === 'PENDING_SCHEDULE' || Boolean(order.isScheduled && order.scheduledAt);
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
  if (status === 'PENDING_SCHEDULE') return 'Rejalashtirilgan';
  if (status === 'NEW') return 'Navbatda';
  if (status === 'PICKING') return 'Yig‘ilmoqda';
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

export function pickerItemProductName(item: PickerOrder['items'][0]): string {
  return item.productName?.trim() || item.product?.name?.trim() || item.title?.trim() || 'Mahsulot';
}

/** Muted subtitle under product name; falls back for cached legacy API payloads. */
export function pickerItemSubtitle(item: PickerOrder['items'][0]): string {
  if (item.subtitle?.trim()) return item.subtitle.trim();
  const name = pickerItemProductName(item);
  const parts: string[] = [];
  const variant = item.variantName?.trim() || item.variant?.title?.trim();
  const flavor = item.variant?.flavor?.trim();
  const size = item.variant?.size?.trim();
  if (variant && variant.toLowerCase() !== name.toLowerCase()) parts.push(variant);
  if (flavor) parts.push(flavor);
  if (size) parts.push(size);
  return parts.join(' — ');
}

export function pickerItemVerificationCode(item: PickerOrder['items'][0]): string | null {
  const sku = item.sku?.trim();
  if (sku) return `SKU: ${sku}`;
  const barcode = item.barcode?.trim();
  if (barcode) return `Shtrix: ${barcode}`;
  return null;
}

export function itemImageUrl(item: PickerOrder['items'][0]): string | null {
  return item.imageUrl || item.variant?.imageUrl || item.product?.imageUrl || null;
}
