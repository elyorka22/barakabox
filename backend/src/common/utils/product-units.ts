/**
 * Product sale units — single source of truth for Product.unit (API + DB).
 * Must match `ProductUnit` in `backend/prisma/schema.prisma` (see `product-units.sync.spec.ts`).
 * OrderItem may still expose legacy `UnitType` strings; `normalizeIncomingProductUnit` maps those.
 */
export const PRODUCT_UNIT_CODES = [
  'dona',
  'kg',
  'gramm',
  'litr',
  'ml',
  'quti',
  'karobka',
  'toplam',
] as const;

export type ProductUnitCode = (typeof PRODUCT_UNIT_CODES)[number];

/** Tuple shape for class-validator `@IsIn`. */
export const PRODUCT_UNIT_CODES_FOR_VALIDATION = PRODUCT_UNIT_CODES as unknown as [
  ProductUnitCode,
  ...ProductUnitCode[],
];

export const DEFAULT_PRODUCT_UNIT: ProductUnitCode = 'dona';

/** Uzbek labels for UI (DB stores enum codes). */
export const PRODUCT_UNIT_LABEL_UZ: Record<ProductUnitCode, string> = {
  dona: 'dona',
  kg: 'kg',
  gramm: 'gramm',
  litr: 'litr',
  ml: 'ml',
  quti: 'quti',
  karobka: 'karobka',
  toplam: "to'plam",
};

export const PRODUCT_UNIT_SELECT_OPTIONS: ReadonlyArray<{ value: ProductUnitCode; label: string }> =
  PRODUCT_UNIT_CODES.map((value) => ({ value, label: PRODUCT_UNIT_LABEL_UZ[value] }));

export function isProductUnitCode(value: string): value is ProductUnitCode {
  return (PRODUCT_UNIT_CODES as readonly string[]).includes(value);
}

/** Map legacy API/DB values (including old OrderItem.unitType) to ProductUnit. */
export function normalizeIncomingProductUnit(value: unknown): ProductUnitCode | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v === 'piece') return 'dona';
  if (v === 'paket') return 'quti';
  if (v === 'bog') return 'toplam';
  if (v === 'pack') return 'karobka';
  if (isProductUnitCode(v)) return v;
  return null;
}

/** Read sale unit from product JSON (`unit` preferred; `unitType` legacy). */
export function normalizedProductSaleUnit(
  product: { unit?: unknown; unitType?: unknown } | null | undefined,
): ProductUnitCode | null {
  return normalizeIncomingProductUnit(product?.unit ?? product?.unitType);
}

export function formatQuantityWithUnit(quantity: number, unit: ProductUnitCode): string {
  return `${quantity} ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}

/** Cart/order line quantity (grams for weight products). */
export function formatOrderItemQuantity(quantity: number, unit: ProductUnitCode): string {
  if (isWeightBasedUnit(unit)) {
    return formatCartQuantityDisplay(quantity, unit);
  }
  return formatQuantityWithUnit(quantity, unit);
}

/** e.g. "14 000 so'm / kg" — pass already formatted money string from formatMoneyUz. */
export function formatMoneyWithUnitSuffix(formattedMoney: string, unit: ProductUnitCode): string {
  return `${formattedMoney} / ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}

/** Weight products: cart stores integer grams; price label is per kg. */
export function isWeightBasedUnit(unit: ProductUnitCode): boolean {
  return unit === 'kg' || unit === 'gramm';
}

export const CART_GRAM_STEP = 100;
export const CART_GRAM_MIN = 100;

export function getCartQuantityStep(unit: ProductUnitCode): number {
  return isWeightBasedUnit(unit) ? CART_GRAM_STEP : 1;
}

export function getCartMinQuantity(unit: ProductUnitCode): number {
  return isWeightBasedUnit(unit) ? CART_GRAM_MIN : 1;
}

/** Legacy carts stored 1–2 as kilograms; new carts store grams (≥100). */
export function normalizeCartQuantityForUnit(quantity: number, unit: ProductUnitCode): number {
  const q = Math.max(0, Math.round(Number(quantity) || 0));
  if (isWeightBasedUnit(unit) && q > 0 && q < 100) {
    return q * 1000;
  }
  return q;
}

/** Human-readable selected amount for cart UI (grams until 1kg, then kg). */
export function formatCartQuantityDisplay(quantity: number, unit: ProductUnitCode): string {
  if (!isWeightBasedUnit(unit)) {
    return `${quantity} ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
  }
  const grams = normalizeCartQuantityForUnit(quantity, unit);
  if (grams < 1000) {
    return `${grams} gramm`;
  }
  const kg = grams / 1000;
  const text = Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, '');
  return `${text} kg`;
}

/** Line total: for weight, unitPrice is per kg and quantity is grams. */
export function calculateCartLineTotal(
  unitPricePerLabel: number,
  quantity: number,
  unit: ProductUnitCode,
): number {
  const price = Math.round(Number(unitPricePerLabel) || 0);
  const qty = normalizeCartQuantityForUnit(quantity, unit);
  if (isWeightBasedUnit(unit)) {
    return Math.round((price * qty) / 1000);
  }
  return price * qty;
}

export function getCartDecreaseDelta(currentQuantity: number, unit: ProductUnitCode): number {
  const step = getCartQuantityStep(unit);
  const min = getCartMinQuantity(unit);
  if (currentQuantity <= min) {
    return -currentQuantity;
  }
  return -step;
}

/** Stock fields are stored in kg for weight products; cart quantity is grams. */
export function hasEnoughStock(stockUnits: number, cartQuantity: number, unit: ProductUnitCode): boolean {
  if (isWeightBasedUnit(unit)) {
    return stockUnits * 1000 >= cartQuantity;
  }
  return stockUnits >= cartQuantity;
}

export function deductStockUnits(
  stockUnits: number,
  cartQuantity: number,
  unit: ProductUnitCode,
): number {
  if (isWeightBasedUnit(unit)) {
    const remainingGrams = stockUnits * 1000 - cartQuantity;
    return Math.max(0, Math.floor(remainingGrams / 1000));
  }
  return Math.max(0, stockUnits - cartQuantity);
}
