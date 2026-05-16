export type CustomerLoyaltyTier = 'NEW' | 'RETURNING' | 'LOYAL' | 'VIP';

export const LOYALTY_LABELS: Record<CustomerLoyaltyTier, string> = {
  NEW: 'Yangi mijoz',
  RETURNING: 'Qaytgan mijoz',
  LOYAL: 'Sadoqatli mijoz',
  VIP: 'VIP mijoz',
};

export function loyaltyBadgeClass(tier: CustomerLoyaltyTier): string {
  switch (tier) {
    case 'VIP':
      return 'bg-violet-100 text-violet-900';
    case 'LOYAL':
      return 'bg-amber-100 text-amber-900';
    case 'RETURNING':
      return 'bg-sky-100 text-sky-900';
    case 'NEW':
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
