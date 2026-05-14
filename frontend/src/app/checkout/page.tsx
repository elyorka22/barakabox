'use client';

import { Suspense } from 'react';
import { CheckoutScreen } from '@/components/checkout-screen';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh bg-[#F4F5F7]">
          <div className="mx-auto max-w-lg px-4 pt-4">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200/80" />
            <div className="mt-6 h-40 animate-pulse rounded-[22px] bg-white shadow-sm" />
          </div>
        </main>
      }
    >
      <CheckoutScreen />
    </Suspense>
  );
}
