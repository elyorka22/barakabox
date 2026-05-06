export function formatMoneyUz(value: number | string): string {
  const amount = Math.round(Number(value) || 0);
  return `${amount.toLocaleString('uz-UZ')} so'm`;
}
