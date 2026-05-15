export type ProfileNotifCounts = {
  orders: number;
  promotions: number;
  delivery: number;
  cashback: number;
};

const ZEROS: ProfileNotifCounts = {
  orders: 0,
  promotions: 0,
  delivery: 0,
  cashback: 0,
};

/** Operational notification counts — no demo defaults. */
export function getProfileNotifCounts(activeOrderCount = 0, cashbackBalance = 0): ProfileNotifCounts {
  return {
    orders: activeOrderCount > 0 ? 1 : 0,
    promotions: 0,
    delivery: activeOrderCount > 0 ? 1 : 0,
    cashback: cashbackBalance > 0 ? 1 : 0,
  };
}

export function emptyProfileNotifCounts(): ProfileNotifCounts {
  return { ...ZEROS };
}
