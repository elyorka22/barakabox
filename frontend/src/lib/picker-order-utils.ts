import type { PickerOrder, PickerPriority } from './picker-types';

const URGENT_AGE_MS = 15 * 60_000;

export function orderPriority(order: PickerOrder): PickerPriority {
  const age = Date.now() - new Date(order.createdAt).getTime();
  const note = (order.deliveryNote || '').toLowerCase();
  if (age >= URGENT_AGE_MS || note.includes('shosh') || note.includes('tez')) {
    return 'shoshilinch';
  }
  return 'oddiy';
}

export function sortPickerOrders(orders: PickerOrder[]): PickerOrder[] {
  return [...orders].sort((a, b) => {
    const pa = orderPriority(a) === 'shoshilinch' ? 1 : 0;
    const pb = orderPriority(b) === 'shoshilinch' ? 1 : 0;
    if (pb !== pa) return pb - pa;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function estimatePickMinutes(order: PickerOrder): number {
  const base = 3;
  const perItem = 2;
  return base + order.items.length * perItem;
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

export function paymentTypeLabel(): string {
  return 'Yetkazib berishda to‘lov';
}

export function statusLabelUz(status: string): string {
  if (status === 'NEW') return 'Navbatda';
  if (status === 'PICKING') return 'Yig‘ilmoqda';
  if (status === 'READY') return 'Tayyor';
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
