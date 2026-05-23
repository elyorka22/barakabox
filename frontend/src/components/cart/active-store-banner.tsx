'use client';

import Link from 'next/link';
import { getActiveStore } from '@/lib/cart-store-context';

export function ActiveStoreBanner() {
  const store = getActiveStore();
  if (!store) return null;

  return (
    <div className="mx-4 mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
      <span className="font-medium">Do‘kon:</span> {store.storeName}
      {store.storeSlug ? (
        <>
          {' '}
          <Link href={`/stores/${store.storeSlug}`} className="font-semibold underline">
            Sahifaga
          </Link>
        </>
      ) : null}
    </div>
  );
}
