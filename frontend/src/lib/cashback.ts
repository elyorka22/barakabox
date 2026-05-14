/** Mirrors server `cashbackPendingForLine` (tiyin). */
export function estimateLineCashbackTiyin(lineSubtotalTiyin: number, cashbackType: string, cashbackValue: number): number {
  if (lineSubtotalTiyin <= 0 || cashbackType === 'NONE' || !cashbackValue) return 0;
  if (cashbackType === 'PERCENT') {
    const p = Math.min(100, Math.max(0, cashbackValue));
    return Math.floor((lineSubtotalTiyin * p) / 100);
  }
  if (cashbackType === 'FIXED_AMOUNT') {
    return Math.min(lineSubtotalTiyin, cashbackValue);
  }
  return 0;
}

export type CashbackPromo = { kind: 'percent' | 'fixed'; label: string };

/** Label + kind for UI (badges). Fixed amount uses same integer unit as prices (no /100). */
export function getCashbackPromoLabel(cashbackType: string, cashbackValue: number): CashbackPromo | null {
  if (cashbackType === 'NONE' || !cashbackValue) return null;
  if (cashbackType === 'PERCENT') {
    const p = Math.min(100, Math.max(0, cashbackValue));
    return { kind: 'percent', label: `${p}% keshbek` };
  }
  if (cashbackType === 'FIXED_AMOUNT') {
    return {
      kind: 'fixed',
      label: `+${Math.round(cashbackValue).toLocaleString('uz-UZ')} so'm`,
    };
  }
  return null;
}

export function cashbackBadgeText(cashbackType: string, cashbackValue: number): string | null {
  return getCashbackPromoLabel(cashbackType, cashbackValue)?.label ?? null;
}
