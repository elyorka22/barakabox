export type LoyaltyTierKey = 'silver' | 'gold' | 'vip';

export type ProfileLoyaltyDisplay = {
  tierKey: LoyaltyTierKey;
  tierTitle: string;
  cashbackSoM: number;
  savedMonthSoM: number;
  totalPurchasesSoM: number;
  referralBonusSoM: number;
};

const STORAGE_KEY = 'barakabox_profile_loyalty_v1';

export function emptyProfileLoyalty(): ProfileLoyaltyDisplay {
  return {
    tierKey: 'silver',
    tierTitle: 'Silver',
    cashbackSoM: 0,
    savedMonthSoM: 0,
    totalPurchasesSoM: 0,
    referralBonusSoM: 0,
  };
}

export function getProfileLoyaltyDisplay(userId: string): ProfileLoyaltyDisplay {
  if (typeof window === 'undefined' || !userId) {
    return emptyProfileLoyalty();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfileLoyalty();
    const parsed = JSON.parse(raw) as Partial<ProfileLoyaltyDisplay> & { userId?: string };
    if (parsed?.userId !== userId) return emptyProfileLoyalty();
    return {
      tierKey: (parsed.tierKey as LoyaltyTierKey) ?? 'silver',
      tierTitle: parsed.tierTitle ?? 'Silver',
      cashbackSoM: typeof parsed.cashbackSoM === 'number' ? parsed.cashbackSoM : 0,
      savedMonthSoM: typeof parsed.savedMonthSoM === 'number' ? parsed.savedMonthSoM : 0,
      totalPurchasesSoM: typeof parsed.totalPurchasesSoM === 'number' ? parsed.totalPurchasesSoM : 0,
      referralBonusSoM: typeof parsed.referralBonusSoM === 'number' ? parsed.referralBonusSoM : 0,
    };
  } catch {
    return emptyProfileLoyalty();
  }
}

export function saveProfileLoyalty(userId: string, patch: Partial<ProfileLoyaltyDisplay>): ProfileLoyaltyDisplay {
  const current = getProfileLoyaltyDisplay(userId);
  const next = { ...current, ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, ...next }));
    } catch {
      /* ignore */
    }
  }
  return next;
}
