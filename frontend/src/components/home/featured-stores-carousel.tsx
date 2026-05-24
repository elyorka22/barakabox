'use client';

import Link from 'next/link';
import { StoreCardLink } from '@/components/stores/store-card';
import type { StoreCard } from '@/lib/stores-api';

type Props = {
  stores: StoreCard[];
};

/** Compact featured row (legacy); prefer HomeStoresShowcase on homepage. */
export function FeaturedStoresCarousel({ stores }: Props) {
  if (stores.length === 0) return null;

  return (
    <section className="mt-6" aria-labelledby="featured-stores-heading">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 id="featured-stores-heading" className="text-base font-semibold text-[#111827]">
          Do‘konlar
        </h2>
        <Link href="/stores" className="text-xs font-semibold text-emerald-700">
          Barchasi
        </Link>
      </div>
      <div className="bb-scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {stores.map((store) => (
          <StoreCardLink key={store.id} store={store} variant="carousel" />
        ))}
      </div>
    </section>
  );
}
