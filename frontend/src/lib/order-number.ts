/** Readable order codes — excludes O/0 and I/1 for phone-friendly pronunciation. */
export const ORDER_NUMBER_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ORDER_NUMBER_LENGTH = 8;

export function generateOrderNumber(): string {
  const len = ORDER_NUMBER_CHARSET.length;
  let out = '';
  const bytes = new Uint8Array(ORDER_NUMBER_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < ORDER_NUMBER_LENGTH; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < ORDER_NUMBER_LENGTH; i += 1) {
    out += ORDER_NUMBER_CHARSET[bytes[i]! % len]!;
  }
  return out;
}

export function normalizeOrderNumber(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw.trim().toUpperCase().replace(/^#/, '');
}

export function formatOrderNumberLabel(orderNumber: string | null | undefined): string {
  const n = normalizeOrderNumber(orderNumber);
  return n ? `#${n}` : '—';
}

export function displayOrderNumber(order: {
  orderNumber?: string | null;
  id?: string | null;
}): string {
  const n = normalizeOrderNumber(order.orderNumber);
  if (n) return n;
  if (order.id?.trim()) return order.id.trim().slice(-8).toUpperCase();
  return '—';
}
