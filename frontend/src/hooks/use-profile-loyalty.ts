'use client';

import { useEffect, useState } from 'react';
import { api, type StoredUser } from '@/lib/api';
import {
  emptyProfileLoyalty,
  getProfileLoyaltyDisplay,
  saveProfileLoyalty,
  type ProfileLoyaltyDisplay,
} from '@/lib/profile-loyalty-storage';

function normalizePhone(raw?: string | null): string {
  return (raw ?? '').replace(/\D/g, '');
}

export function useProfileLoyalty(user: StoredUser | null) {
  const [loyalty, setLoyalty] = useState<ProfileLoyaltyDisplay>(emptyProfileLoyalty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoyalty(emptyProfileLoyalty());
      return;
    }

    const cached = getProfileLoyaltyDisplay(user.id);
    setLoyalty(cached);

    const phone = normalizePhone(user.phone);
    if (!phone) return;

    setLoading(true);
    void (async () => {
      try {
        const res = await api.get<{ cashbackBalanceTiyin: number }>(
          `/customers/cashback-balance?phone=${encodeURIComponent(phone)}`,
        );
        const cashbackSoM = Math.max(0, Number(res.cashbackBalanceTiyin) || 0);
        const next = saveProfileLoyalty(user.id, { cashbackSoM });
        setLoyalty(next);
      } catch {
        setLoyalty(cached);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, user?.phone]);

  return { loyalty, loading };
}
