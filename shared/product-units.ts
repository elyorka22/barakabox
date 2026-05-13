/**
 * Product sale units — single source of truth.
 * Must match `UnitType` in `backend/prisma/schema.prisma` (see `product-units.sync.spec.ts`).
 */
export const PRODUCT_UNIT_CODES = [
  'dona',
  'kg',
  'gramm',
  'litr',
  'ml',
  'quti',
  'karobka',
  'paket',
  'toplam',
  'bog',
  'pack',
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
  paket: 'paket',
  toplam: "to'plam",
  bog: "bog'",
  pack: 'pack',
};

export const PRODUCT_UNIT_SELECT_OPTIONS: ReadonlyArray<{ value: ProductUnitCode; label: string }> =
  PRODUCT_UNIT_CODES.map((value) => ({ value, label: PRODUCT_UNIT_LABEL_UZ[value] }));

export function isProductUnitCode(value: string): value is ProductUnitCode {
  return (PRODUCT_UNIT_CODES as readonly string[]).includes(value);
}

/** Map legacy API/DB values after enum migration. */
export function normalizeIncomingProductUnit(value: unknown): ProductUnitCode | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v === 'piece') return 'dona';
  if (isProductUnitCode(v)) return v;
  return null;
}

export function formatQuantityWithUnit(quantity: number, unit: ProductUnitCode): string {
  return `${quantity} ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}

/** e.g. "14 000 so'm / kg" — pass already formatted money string from formatMoneyUz. */
export function formatMoneyWithUnitSuffix(formattedMoney: string, unit: ProductUnitCode): string {
  return `${formattedMoney} / ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}
