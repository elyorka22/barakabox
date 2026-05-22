/**
 * Order number helpers for backend (keep in sync with shared/order-number.ts).
 * Copied here because Docker backend build context is backend/ only.
 */

/** Readable order codes — excludes O/0 and I/1 for phone-friendly pronunciation. */
export const ORDER_NUMBER_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ORDER_NUMBER_LENGTH = 8;

export function normalizeOrderNumber(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw.trim().toUpperCase().replace(/^#/, '');
}

/** Display label e.g. #6L984TV6 */
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
