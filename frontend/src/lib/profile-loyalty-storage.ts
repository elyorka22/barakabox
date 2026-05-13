export type LoyaltyTierKey = 'silver' | 'gold' | 'vip';

export type ProfileLoyaltyDisplay = {
  tierKey: LoyaltyTierKey;
  tierTitle: string;
  cashbackSoM: number;
  savedMonthSoM: number;
  referralBonusSoM: number;
};

const STORAGE_KEY = 'barakabox_profile_loyalty_v1';

function hashUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function defaultDisplay(seed: number): ProfileLoyaltyDisplay {
  const mod = seed % 3;
  const tierKey: LoyaltyTierKey = mod === 0 ? 'gold' : mod === 1 ? 'silver' : 'vip';
  const tierTitle =
    tierKey === 'gold' ? 'Gold Member' : tierKey === 'silver' ? 'Silver Member' : 'VIP Member';
  const bump = (seed % 5) * 500;
  return {
    tierKey,
    tierTitle,
    cashbackSoM: 12_450 + bump,
    savedMonthSoM: 185_000 + bump * 2,
    referralBonusSoM: 10_000,
  };
}

export function getProfileLoyaltyDisplay(userId: string): ProfileLoyaltyDisplay {
  if (typeof window === 'undefined') {
    return defaultDisplay(hashUserId(userId || 'guest'));
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProfileLoyaltyDisplay> & { userId?: string };
      if (parsed && parsed.userId === userId && typeof parsed.cashbackSoM === 'number') {
        return {
          tierKey: (parsed.tierKey as LoyaltyTierKey) ?? 'gold',
          tierTitle: parsed.tierTitle ?? 'Gold Member',
          cashbackSoM: parsed.cashbackSoM,
          savedMonthSoM: typeof parsed.savedMonthSoM === 'number' ? parsed.savedMonthSoM : 185_000,
          referralBonusSoM: typeof parsed.referralBonusSoM === 'number' ? parsed.referralBonusSoM : 10_000,
        };
      }
    }
  } catch {
    // fall through
  }
  const display = defaultDisplay(hashUserId(userId || 'guest'));
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, ...display }),
    );
  } catch {
    // ignore
  }
  return display;
}
