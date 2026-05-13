export type ProfileNotifCounts = {
  orders: number;
  promotions: number;
  delivery: number;
  cashback: number;
};

const KEY = 'barakabox_profile_notif_counts_v1';

const DEFAULTS: ProfileNotifCounts = {
  orders: 1,
  promotions: 2,
  delivery: 0,
  cashback: 1,
};

export function getProfileNotifCounts(): ProfileNotifCounts {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) {
      window.sessionStorage.setItem(KEY, JSON.stringify(DEFAULTS));
      return DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<ProfileNotifCounts>;
    return {
      orders: typeof parsed.orders === 'number' ? parsed.orders : DEFAULTS.orders,
      promotions: typeof parsed.promotions === 'number' ? parsed.promotions : DEFAULTS.promotions,
      delivery: typeof parsed.delivery === 'number' ? parsed.delivery : DEFAULTS.delivery,
      cashback: typeof parsed.cashback === 'number' ? parsed.cashback : DEFAULTS.cashback,
    };
  } catch {
    return DEFAULTS;
  }
}
