import type { CartItem } from '@/lib/cart-store';

export type OrderStatusLite = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

export type LastOrderItemLine = {
  title: string;
  quantity: number;
  variantId?: string | null;
  productId?: string | null;
  boxId?: string | null;
};

export type LastOrderSnapshot = {
  id: string;
  status: OrderStatusLite;
  createdAt: string;
  totalAmount?: number;
  items: LastOrderItemLine[];
  courierName?: string | null;
};

export function enrichOrderLinesFromCart(cartItems: CartItem[]): LastOrderItemLine[] {
  const lines: LastOrderItemLine[] = [];
  for (const item of cartItems) {
    const v = item.variant;
    const productId = v?.product?.id;
    if (v?.id && productId) {
      const title = (v.title || v.flavor || item.product?.name || 'Mahsulot').trim() || 'Mahsulot';
      lines.push({
        title,
        quantity: item.quantity,
        variantId: v.id,
        productId,
      });
    }
  }
  return lines;
}

const STORAGE_KEY = 'barakabox_last_order_v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStatus(value: unknown): OrderStatusLite {
  const s = String(value ?? '').toUpperCase();
  if (s === 'NEW' || s === 'PICKING' || s === 'READY' || s === 'DELIVERING' || s === 'DELIVERED' || s === 'CANCELLED') {
    return s;
  }
  return 'NEW';
}

function normalizeItems(raw: unknown, enrich: LastOrderItemLine[]): LastOrderItemLine[] {
  if (!Array.isArray(raw)) return enrich.length ? enrich : [];
  const fromApi: LastOrderItemLine[] = raw.map((row) => {
    if (!isRecord(row)) {
      return { title: '', quantity: 1 };
    }
    const variantId = typeof row.variantId === 'string' ? row.variantId : null;
    let productId = typeof row.productId === 'string' ? row.productId : null;
    if (variantId && !productId) {
      const hit = enrich.find((line) => line.variantId === variantId);
      productId = hit?.productId ?? null;
    }
    return {
      title: typeof row.title === 'string' ? row.title : 'Mahsulot',
      quantity: typeof row.quantity === 'number' && row.quantity > 0 ? row.quantity : 1,
      variantId,
      productId,
      boxId: typeof row.boxId === 'string' ? row.boxId : null,
    };
  });
  if (fromApi.length) return fromApi;
  return enrich;
}

function courierNameFromOrder(order: Record<string, unknown>): string | null {
  const courier = order.assignedCourier;
  if (!isRecord(courier)) return null;
  const name = courier.fullName;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

export function readLastOrderSnapshot(): LastOrderSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const id = typeof parsed.id === 'string' ? parsed.id : '';
    if (!id) return null;
    return {
      id,
      status: parseStatus(parsed.status),
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : undefined,
      items: normalizeItems(parsed.items, []),
      courierName: typeof parsed.courierName === 'string' ? parsed.courierName : courierNameFromOrder(parsed),
    };
  } catch {
    return null;
  }
}

export function saveLastOrderSnapshot(order: unknown, enrichItems: LastOrderItemLine[] = []): void {
  if (typeof window === 'undefined') return;
  if (!isRecord(order)) return;
  const id = typeof order.id === 'string' ? order.id : '';
  if (!id) return;
  const snapshot: LastOrderSnapshot = {
    id,
    status: parseStatus(order.status),
    createdAt: typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString(),
    totalAmount:
      typeof order.totalAmount === 'number'
        ? order.totalAmount
        : typeof order.totalAmount === 'string'
          ? Number(order.totalAmount)
          : undefined,
    items: normalizeItems(order.items, enrichItems),
    courierName: courierNameFromOrder(order),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota / private mode
  }
}

export function clearLastOrderSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isActiveDeliveryStatus(status: OrderStatusLite): boolean {
  return status === 'NEW' || status === 'PICKING' || status === 'READY' || status === 'DELIVERING';
}

export function orderStatusLabelUz(status: OrderStatusLite): string {
  switch (status) {
    case 'NEW':
      return 'Buyurtma qabul qilindi';
    case 'PICKING':
      return 'Buyurtma yig‘ilmoqda';
    case 'READY':
      return 'Yetkazib berishga tayyor';
    case 'DELIVERING':
      return 'Yo‘lda';
    case 'DELIVERED':
      return 'Yetkazildi';
    case 'CANCELLED':
      return 'Bekor qilindi';
    default:
      return 'Holat';
  }
}

export function orderEtaHintUz(status: OrderStatusLite): string {
  switch (status) {
    case 'DELIVERING':
      return 'Taxminan 10–20 daqiqada';
    case 'READY':
      return 'Kuryer yo‘lga chiqmoqda';
    case 'PICKING':
      return 'Taxminan 15–25 daqiqada';
    case 'NEW':
      return 'Taxminan 25–35 daqiqada';
    default:
      return '';
  }
}

export function orderProgressPercent(status: OrderStatusLite): number {
  switch (status) {
    case 'NEW':
      return 18;
    case 'PICKING':
      return 42;
    case 'READY':
      return 68;
    case 'DELIVERING':
      return 88;
    case 'DELIVERED':
      return 100;
    default:
      return 0;
  }
}
