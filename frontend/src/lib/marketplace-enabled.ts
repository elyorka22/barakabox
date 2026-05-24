/**
 * Multi-store marketplace UI/API freeze. Default off — single-seller legacy Product catalog only.
 * Set NEXT_PUBLIC_MARKETPLACE_ENABLED=true when third-party stores go live.
 */
export function isMarketplaceEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
