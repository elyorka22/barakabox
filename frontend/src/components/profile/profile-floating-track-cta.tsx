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
        className="pointer-events-auto flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-[#15803D] bg-[#16A34A] px-4 text-sm font-semibold text-white shadow-sm transition active:opacity-90"
      >
        <Truck className="h-4 w-4" />
        Joriy buyurtmani kuzatish
      </Link>
    </div>
  );
}
