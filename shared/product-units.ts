/**
 * Product sale units — single source of truth for Product.unit (API + DB).
 * Must match `ProductUnit` in `backend/prisma/schema.prisma`.
 * `unit` is only the price label (e.g. "/ kg"). Cart step behavior is driven
 * by an independent `SellingMode` (piece / gram_step / kilogram_step) so admins
 * can sell potatoes per kilo and pistachio per 100g without ambiguity.
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

// -----------------------------------------------------------------------------
// SellingMode — explicit cart behavior per product
// -----------------------------------------------------------------------------

export const SELLING_MODES = ['piece', 'gram_step', 'kilogram_step'] as const;
export type SellingMode = (typeof SELLING_MODES)[number];

export const DEFAULT_SELLING_MODE: SellingMode = 'piece';

/** Steps and minimums used everywhere; keep integer-based. */
export const GRAM_STEP = 100;
export const GRAM_MIN = 100;
export const KILOGRAM_STEP = 1;
export const KILOGRAM_MIN = 1;
export const PIECE_STEP = 1;
export const PIECE_MIN = 1;

/** Accept lowercase or uppercase from API/UI; tolerate legacy `unit`-derived strings. */
export function normalizeSellingMode(value: unknown): SellingMode | null {
  if (typeof value !== 'string' || !value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'piece') return 'piece';
  if (v === 'gram_step' || v === 'gramstep') return 'gram_step';
  if (v === 'kilogram_step' || v === 'kgstep' || v === 'kilo_step') return 'kilogram_step';
  return null;
}

/**
 * Derive a default selling mode from the price-label `unit` when the product
 * has no explicit `sellingMode` (e.g. legacy data still in transit).
 * - kg     → kilogram_step
 * - gramm  → gram_step
 * - other  → piece
 */
export function fallbackSellingModeFromUnit(unit: ProductUnitCode | null | undefined): SellingMode {
  if (unit === 'kg') return 'kilogram_step';
  if (unit === 'gramm') return 'gram_step';
  return 'piece';
}

/** Read selling mode from a product payload (prefers explicit field, falls back to unit). */
export function resolveSellingMode(
  product:
    | { sellingMode?: unknown; unit?: unknown; unitType?: unknown }
    | null
    | undefined,
): SellingMode {
  const explicit = normalizeSellingMode(product?.sellingMode);
  if (explicit) return explicit;
  const unit = normalizedProductSaleUnit(product);
  return fallbackSellingModeFromUnit(unit);
}

export function getSellingModeStep(mode: SellingMode): number {
  if (mode === 'gram_step') return GRAM_STEP;
  if (mode === 'kilogram_step') return KILOGRAM_STEP;
  return PIECE_STEP;
}

export function getSellingModeMin(mode: SellingMode): number {
  if (mode === 'gram_step') return GRAM_MIN;
  if (mode === 'kilogram_step') return KILOGRAM_MIN;
  return PIECE_MIN;
}

export function getSellingModeDecreaseDelta(currentQuantity: number, mode: SellingMode): number {
  const step = getSellingModeStep(mode);
  const min = getSellingModeMin(mode);
  if (currentQuantity <= min) {
    return -currentQuantity;
  }
  return -step;
}

/** Human-readable selected amount: "200 gramm", "1.5 kg", "3 dona". */
export function formatSellingModeQuantity(
  quantity: number,
  mode: SellingMode,
  unit: ProductUnitCode = DEFAULT_PRODUCT_UNIT,
): string {
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  if (mode === 'gram_step') {
    if (qty < 1000) return `${qty} gramm`;
    const kg = qty / 1000;
    const text = Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, '');
    return `${text} kg`;
  }
  if (mode === 'kilogram_step') {
    return `${qty} kg`;
  }
  return `${qty} ${PRODUCT_UNIT_LABEL_UZ[unit] ?? PRODUCT_UNIT_LABEL_UZ.dona}`;
}

/**
 * Line total. Price is the *catalog* price (assumed per kg for weight products,
 * per piece otherwise — the historic convention). Cart quantity follows the mode.
 */
export function calculateSellingModeLineTotal(
  unitPrice: number,
  quantity: number,
  mode: SellingMode,
): number {
  const price = Math.round(Number(unitPrice) || 0);
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  if (mode === 'gram_step') {
    return Math.round((price * qty) / 1000);
  }
  return price * qty;
}

/** Stock decrement after an order. Stock is stored in kg for kg-priced products. */
export function hasEnoughStockForMode(
  stockUnits: number,
  cartQuantity: number,
  mode: SellingMode,
): boolean {
  if (mode === 'gram_step') {
    return stockUnits * 1000 >= cartQuantity;
  }
  return stockUnits >= cartQuantity;
}

export function deductStockForMode(
  stockUnits: number,
  cartQuantity: number,
  mode: SellingMode,
): number {
  if (mode === 'gram_step') {
    const remainingGrams = stockUnits * 1000 - cartQuantity;
    return Math.max(0, Math.floor(remainingGrams / 1000));
  }
  return Math.max(0, stockUnits - cartQuantity);
}

// -----------------------------------------------------------------------------
// Legacy compatibility — old call sites pass `unit` alone.
// These helpers preserve the previous behaviour while we migrate UI components.
// New code should call the `*SellingMode*` helpers above instead.
// -----------------------------------------------------------------------------

export function formatQuantityWithUnit(quantity: number, unit: ProductUnitCode): string {
  return `${quantity} ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}

export function formatOrderItemQuantity(
  quantity: number,
  unit: ProductUnitCode,
  sellingMode?: SellingMode | null,
): string {
  const mode = sellingMode ?? fallbackSellingModeFromUnit(unit);
  return formatSellingModeQuantity(quantity, mode, unit);
}

export function formatMoneyWithUnitSuffix(formattedMoney: string, unit: ProductUnitCode): string {
  return `${formattedMoney} / ${PRODUCT_UNIT_LABEL_UZ[unit]}`;
}

/** @deprecated Use resolveSellingMode → mode === 'gram_step' instead. */
export function isWeightBasedUnit(unit: ProductUnitCode): boolean {
  return unit === 'kg' || unit === 'gramm';
}

/** @deprecated Use getSellingModeStep(resolveSellingMode(product)). */
export function getCartQuantityStep(unit: ProductUnitCode): number {
  return getSellingModeStep(fallbackSellingModeFromUnit(unit));
}

/** @deprecated Use getSellingModeMin(resolveSellingMode(product)). */
export function getCartMinQuantity(unit: ProductUnitCode): number {
  return getSellingModeMin(fallbackSellingModeFromUnit(unit));
}

export function normalizeCartQuantityForUnit(quantity: number, unit: ProductUnitCode): number {
  const q = Math.max(0, Math.round(Number(quantity) || 0));
  // Legacy carts may have stored kg as integers like 1 or 2; only upgrade old
  // gram-step rows where unit === 'gramm' and qty < 100.
  if (unit === 'gramm' && q > 0 && q < 100) {
    return q * 1000;
  }
  return q;
}

export function formatCartQuantityDisplay(quantity: number, unit: ProductUnitCode): string {
  const mode = fallbackSellingModeFromUnit(unit);
  return formatSellingModeQuantity(quantity, mode, unit);
}

export function calculateCartLineTotal(
  unitPricePerLabel: number,
  quantity: number,
  unit: ProductUnitCode,
): number {
  return calculateSellingModeLineTotal(
    unitPricePerLabel,
    quantity,
    fallbackSellingModeFromUnit(unit),
  );
}

export function getCartDecreaseDelta(currentQuantity: number, unit: ProductUnitCode): number {
  return getSellingModeDecreaseDelta(currentQuantity, fallbackSellingModeFromUnit(unit));
}

export function hasEnoughStock(stockUnits: number, cartQuantity: number, unit: ProductUnitCode): boolean {
  return hasEnoughStockForMode(stockUnits, cartQuantity, fallbackSellingModeFromUnit(unit));
}

export function deductStockUnits(
  stockUnits: number,
  cartQuantity: number,
  unit: ProductUnitCode,
): number {
  return deductStockForMode(stockUnits, cartQuantity, fallbackSellingModeFromUnit(unit));
}

export const CART_GRAM_STEP = GRAM_STEP;
export const CART_GRAM_MIN = GRAM_MIN;

/** Uzbek labels for admin form. */
export const SELLING_MODE_LABEL_UZ: Record<SellingMode, string> = {
  piece: "Dona ko'rinishida",
  gram_step: 'Gramm bilan (100g qadam)',
  kilogram_step: 'Kilogramm bilan (1kg qadam)',
};

export const SELLING_MODE_HINT_UZ: Record<SellingMode, string> = {
  piece: 'Cola, non, tuxum — har bosishda +1 dona',
  gram_step: "Pista, yong'oq, pishloq, premium go'sht — +100g qadam",
  kilogram_step: 'Kartoshka, piyoz, sabzi, tarvuz — +1 kg qadam',
};

export const SELLING_MODE_OPTIONS: ReadonlyArray<{
  value: SellingMode;
  label: string;
  hint: string;
}> = SELLING_MODES.map((value) => ({
  value,
  label: SELLING_MODE_LABEL_UZ[value],
  hint: SELLING_MODE_HINT_UZ[value],
}));
