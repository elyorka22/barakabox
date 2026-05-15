import type { CourierOrder, OrderPriority } from './courier-types';

const HUB_LAT = 40.9984;
const HUB_LNG = 71.0722;

const PRIORITY_WEIGHT: Record<OrderPriority, number> = {
  HOT: 4,
  DELAYED: 3,
  VIP: 2,
  LONG_DISTANCE: 1,
};

export function estimateDistanceKm(order: CourierOrder): number | null {
  if (order.distanceKm != null) return order.distanceKm;
  const lat = order.latitude;
  const lng = order.longitude;
  if (lat == null || lng == null) return null;
  const R = 6371;
  const dLat = ((lat - HUB_LAT) * Math.PI) / 180;
  const dLng = ((lng - HUB_LNG) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((HUB_LAT * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function estimateEtaMinutes(order: CourierOrder): number | null {
  if (order.etaMinutes != null) return order.etaMinutes;
  const km = estimateDistanceKm(order);
  if (km == null) return null;
  return Math.max(8, Math.round(km * 4 + 6));
}

export function googleMapsHref(order: CourierOrder): string | null {
  const lat = order.latitude;
  const lng = order.longitude;
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`;
}

export function yandexMapsHref(order: CourierOrder): string | null {
  const lat = order.latitude;
  const lng = order.longitude;
  if (lat == null || lng == null) return null;
  return `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`;
}

export function staticMapPreviewUrl(order: CourierOrder): string | null {
  const lat = order.latitude;
  const lng = order.longitude;
  if (lat == null || lng == null) return null;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=400x120&markers=${lat},${lng},red`;
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

export function orderStatusLabelUz(status: string): string {
  if (status === 'READY') return 'Tayyor';
  if (status === 'DELIVERING') return 'Yo‘lda';
  if (status === 'DELIVERED') return 'Yetkazildi';
  return status;
}

export function sortOrdersByPriority(orders: CourierOrder[]): CourierOrder[] {
  return [...orders].sort((a, b) => priorityScore(b) - priorityScore(a));
}

function priorityScore(order: CourierOrder): number {
  const p = order.priorities ?? [];
  return p.reduce((s, tag) => s + (PRIORITY_WEIGHT[tag] ?? 0), 0);
}

export function playNewOrderAlert(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([140, 70, 140, 70, 140]);
    }
  } catch {
    // ignore
  }
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 920;
    gain.gain.value = 0.12;
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 1100;
      g2.gain.value = 0.1;
      o2.start();
      o2.stop(ctx.currentTime + 0.18);
    }, 180);
  } catch {
    // ignore
  }
}
