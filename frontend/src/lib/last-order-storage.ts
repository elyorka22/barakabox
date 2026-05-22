import type { CartItem } from '@/lib/cart-store';
import {
  type ProductUnitCode,
  type SellingMode,
  DEFAULT_PRODUCT_UNIT,
  normalizeIncomingProductUnit,
  normalizeSellingMode,
  normalizedProductSaleUnit,
  resolveSellingMode,
} from '@onlinebozor/product-units';
import {
  customerOrderProgressPercent,
  customerOrderStatusLabel,
  isActiveCustomerOrder,
} from '@/lib/order-status';

export type OrderStatusLite =
  | 'PENDING_SCHEDULE'
  | 'NEW'
  | 'PICKING'
  | 'READY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

export type LastOrderItemLine = {
  title: string;
  quantity: number;
  unitType?: ProductUnitCode;
  sellingMode?: SellingMode;
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
      const productForMeta = v?.product ?? item.product;
      const unitType = normalizedProductSaleUnit(productForMeta ?? undefined) ?? DEFAULT_PRODUCT_UNIT;
      const sellingMode = resolveSellingMode(productForMeta);
      lines.push({
        title,
        quantity: item.quantity,
        variantId: v.id,
        productId,
        unitType,
        sellingMode,
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
      return { title: '', quantity: 1, unitType: DEFAULT_PRODUCT_UNIT };
    }
    const variantId = typeof row.variantId === 'string' ? row.variantId : null;
    let productId = typeof row.productId === 'string' ? row.productId : null;
    if (variantId && !productId) {
      const hit = enrich.find((line) => line.variantId === variantId);
      productId = hit?.productId ?? null;
    }
    const unitRaw = row.unitType ?? row.unit;
    const unitType = normalizeIncomingProductUnit(unitRaw) ?? DEFAULT_PRODUCT_UNIT;
    const sellingMode = normalizeSellingMode(row.sellingMode) ?? undefined;
    return {
      title: typeof row.title === 'string' ? row.title : 'Mahsulot',
      quantity: typeof row.quantity === 'number' && row.quantity > 0 ? row.quantity : 1,
      unitType,
      sellingMode,
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
  return isActiveCustomerOrder(status);
}

export function orderStatusLabelUz(status: OrderStatusLite): string {
  return customerOrderStatusLabel(status);
}

export function orderEtaHintUz(status: OrderStatusLite): string {
  switch (status) {
    case 'NEW':
      return 'Picker qabul qilishi kutilmoqda';
    case 'PICKING':
    case 'READY':
      return 'Kuryer tayinlanishi kutilmoqda';
    case 'DELIVERING':
      return 'Taxminan 10–20 daqiqada';
    default:
      return '';
  }
}

export function orderProgressPercent(status: OrderStatusLite): number {
  return customerOrderProgressPercent(status);
}
