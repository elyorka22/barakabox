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

export function cashbackBadgeText(cashbackType: string, cashbackValue: number): string | null {
  if (cashbackType === 'NONE' || !cashbackValue) return null;
  if (cashbackType === 'PERCENT') return `${cashbackValue}% keshbek`;
  if (cashbackType === 'FIXED_AMOUNT') {
    const sum = Math.round(cashbackValue / 100);
    return `+${sum.toLocaleString('uz-UZ')} so'm keshbek`;
  }
  return null;
}
