/** Multi-store marketplace (Store / GlobalProduct / StoreProduct). Default: off until partners onboard. */
export function isMarketplaceEnabled(): boolean {
  const v = process.env.MARKETPLACE_ENABLED?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
