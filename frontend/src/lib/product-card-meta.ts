import {
  PRODUCT_UNIT_LABEL_UZ,
  type ProductUnitCode,
} from '@onlinebozor/product-units';

/** Short weight/count line for compact grid cards (Lavka-style). */
export function buildProductCardUnitLine(input: {
  unit: ProductUnitCode;
  minimumAmount?: number | null;
  stepAmount?: number | null;
}): string {
  const amount = input.minimumAmount ?? input.stepAmount;
  if (amount && amount > 0) {
    if (input.unit === 'gramm') return `${amount} g`;
    if (input.unit === 'ml') return `${amount} ml`;
    if (input.unit === 'kg') return `${amount} kg`;
    if (input.unit === 'litr') return `${amount} l`;
    if (input.unit === 'dona') return `${amount} dona`;
    return `${amount} ${PRODUCT_UNIT_LABEL_UZ[input.unit]}`;
  }
  return PRODUCT_UNIT_LABEL_UZ[input.unit] ?? '';
}

type MetaInput = {
  flavor?: string | null;
  subtitle?: string | null;
  categoryName?: string | null;
  unit: ProductUnitCode;
  minimumAmount?: number | null;
  stepAmount?: number | null;
};

export function buildProductCardMetaLine(input: MetaInput): string {
  const flavor = input.flavor?.trim();
  if (flavor) return flavor;

  const subtitle = input.subtitle?.trim();
  if (subtitle) return subtitle;

  const amount = input.minimumAmount ?? input.stepAmount;
  if (amount && amount > 0) {
    if (input.unit === 'gramm') return `${amount}g`;
    if (input.unit === 'ml') return `${amount} ml`;
    if (input.unit === 'kg') return `${amount} kg`;
    if (input.unit === 'litr') return `${amount} l`;
    if (input.unit === 'dona') return `${amount} dona`;
    return `${amount} ${PRODUCT_UNIT_LABEL_UZ[input.unit]}`;
  }

  const category = input.categoryName?.trim();
  if (category) return category;

  return '';
}
