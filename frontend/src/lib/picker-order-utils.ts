import { formatMoneyUz } from './format';
import type { PickerOrder } from './picker-types';

export function internalOrderLabel(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

export function orderDeliveryFeeLabel(order: PickerOrder): string {
  const fee = Number(order.deliveryFee ?? 0);
  return fee === 0 ? 'Bepul yetkazish' : `Yetkazish: ${formatMoneyUz(fee)}`;
}

export function sortPickerOrders(orders: PickerOrder[]): PickerOrder[] {
  return [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
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
