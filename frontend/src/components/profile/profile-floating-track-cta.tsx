'use client';

import Link from 'next/link';
import { Truck } from 'lucide-react';

type Props = {
  visible: boolean;
};

export function ProfileFloatingTrackCta({ visible }: Props) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
      style={{
        bottom: 'calc(var(--bb-mobile-nav-height) + 0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <Link
        href="#active-order"
        className="pointer-events-auto flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#0f172a] px-4 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(15,23,42,0.35)] ring-1 ring-white/10 transition active:scale-[0.99]"
      >
        <Truck className="h-4 w-4" />
        Joriy buyurtmani kuzatish
      </Link>
    </div>
  );
}
