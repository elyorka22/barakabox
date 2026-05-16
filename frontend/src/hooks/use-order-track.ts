'use client';

import { useGuestOrderTracking } from '@/hooks/use-guest-order-tracking';
import type { PublicOrderTrackSnapshot } from '@/lib/order-track';

/** @deprecated Use useGuestOrderTracking instead */
export function useOrderTrack(
  trackingToken: string | null,
  _phone: string,
  enabled: boolean,
) {
  const tracking = useGuestOrderTracking({ pollEnabled: enabled && Boolean(trackingToken) });

  const snapshot: PublicOrderTrackSnapshot | null =
    tracking.selected?.trackingToken === trackingToken || !trackingToken
      ? tracking.snapshot
      : null;

  return {
    snapshot,
    loading: tracking.loading,
    error: tracking.error,
    refresh: tracking.refresh,
  };
}
