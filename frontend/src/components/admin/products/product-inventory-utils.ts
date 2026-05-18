import type { ProductUnitCode, SellingMode } from '@onlinebozor/product-units';

export type AdminProductVariant = {
  id?: string;
  title?: string | null;
  flavor?: string | null;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  stock: number;
  sku?: string | null;
  imageUrl?: string | null;
};

export type AdminInventoryProduct = {
  id: string;
  name: string;
  price: string | number;
  stockQuantity: number;
  unit: string;
  unitType?: string | null;
  sellingMode?: SellingMode | string | null;
  businessId: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  imageThumbUrl?: string | null;
  imageCardUrl?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  variants?: AdminProductVariant[] | null;
  cashbackType?: string | null;
  cashbackValue?: number | null;
};

export type StockFilter = 'all' | 'in_stock' | 'low' | 'out';
export type StatusFilter = 'active' | 'inactive' | 'all';
export type SortBy = 'newest' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc';

export const LOW_STOCK_MAX = 5;

export function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function primarySku(product: AdminInventoryProduct): string {
  const sku = product.variants?.find((v) => v.sku?.trim())?.sku?.trim();
  return sku ?? '—';
}

export type StockTone = 'ok' | 'low' | 'out';

export function stockTone(qty: number): StockTone {
  if (qty <= 0) return 'out';
  if (qty <= LOW_STOCK_MAX) return 'low';
  return 'ok';
}

export function stockToneClass(tone: StockTone) {
  if (tone === 'out') return 'text-rose-700 bg-rose-50';
  if (tone === 'low') return 'text-amber-800 bg-amber-50';
  return 'text-emerald-800 bg-emerald-50';
}

export function statusLabel(product: AdminInventoryProduct) {
  if (!product.isActive) return 'Nofaol';
  const tone = stockTone(product.stockQuantity);
  if (tone === 'out') return 'Tugagan';
  if (tone === 'low') return 'Kam qoldiq';
  return 'Faol';
}

export function statusBadgeClass(product: AdminInventoryProduct) {
  if (!product.isActive) return 'bg-slate-100 text-slate-600';
  const tone = stockTone(product.stockQuantity);
  if (tone === 'out') return 'bg-rose-100 text-rose-800';
  if (tone === 'low') return 'bg-amber-100 text-amber-900';
  return 'bg-emerald-100 text-emerald-800';
}

export function buildQuickStockPatch(product: AdminInventoryProduct, newTotal: number) {
  const variants = product.variants ?? [];
  const stockQuantity = Math.max(0, newTotal);
  const sellingMode = product.sellingMode ?? undefined;

  if (variants.length === 0) {
    return {
      name: product.name,
      price: Number(product.price),
      stockQuantity,
      unit: product.unit as ProductUnitCode,
      ...(sellingMode ? { sellingMode } : {}),
    };
  }

  const mapped = variants.map((variant, idx) => ({
    ...(variant.id ? { id: variant.id } : {}),
    title: variant.flavor?.trim() || variant.title?.trim() || product.name,
    flavor: variant.flavor?.trim() || undefined,
    description: variant.description ?? undefined,
    price: Number(variant.price),
    discountPrice:
      typeof variant.discountPrice === 'number' && variant.discountPrice > 0
        ? variant.discountPrice
        : undefined,
    stock:
      variants.length === 1
        ? stockQuantity
        : idx === 0
          ? Math.max(0, stockQuantity - variants.slice(1).reduce((s, v) => s + Number(v.stock), 0))
          : Number(variant.stock),
    imageUrl: variant.imageUrl?.trim() || undefined,
    sortOrder: idx,
  }));

  return {
    name: product.name,
    price: Number(product.price),
    stockQuantity,
    unit: product.unit as ProductUnitCode,
    ...(sellingMode ? { sellingMode } : {}),
    variants: mapped,
  };
}
