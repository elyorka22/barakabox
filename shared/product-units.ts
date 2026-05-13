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

/** e.g. "14 000 so'm / kg" — pass already formatted money string from formatMoneyUz. */
export function formatMoneyWithUnitSuffix(formattedMoney: string, unit: ProductUnitCode): string {
  return `${formattedMoney} / ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}
