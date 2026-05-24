export type StoreTypeCode =
  | 'GROCERY'
  | 'PHARMACY'
  | 'PET'
  | 'BABY'
  | 'ELECTRONICS'
  | 'COSMETICS';

export const STORE_TYPE_CARDS: {
  type: StoreTypeCode;
  label: string;
  emoji: string;
}[] = [
  { type: 'GROCERY', label: 'Mahsulotlar', emoji: '🛒' },
  { type: 'PHARMACY', label: 'Dorixonalar', emoji: '💊' },
  { type: 'PET', label: 'Hayvonlar uchun', emoji: '🐾' },
  { type: 'BABY', label: 'Bolalar', emoji: '👶' },
  { type: 'ELECTRONICS', label: 'Elektronika', emoji: '📱' },
  { type: 'COSMETICS', label: 'Kosmetika', emoji: '💄' },
];

export function storeTypeQuery(type: StoreTypeCode): string {
  return type.toLowerCase();
}

export function parseStoreTypeQuery(raw?: string | null): StoreTypeCode | undefined {
  const v = raw?.trim().toUpperCase();
  if (STORE_TYPE_CARDS.some((c) => c.type === v)) return v as StoreTypeCode;
  return undefined;
}
