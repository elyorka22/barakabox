'use client';

import Link from 'next/link';
import { StoreCardLink } from '@/components/stores/store-card';
import type { StoreCard } from '@/lib/stores-api';

type Props = {
  stores: StoreCard[];
  loading?: boolean;
};

export function FeaturedStoresCarousel({ stores, loading }: Props) {
  if (!loading && stores.length === 0) return null;

  return (
    <section className="mt-5" aria-labelledby="featured-stores-heading">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 id="featured-stores-heading" className="text-base font-semibold text-[#111827]">
          Do‘konlar
        </h2>
        <Link href="/stores" className="text-xs font-semibold text-emerald-700">
          Barchasi
        </Link>
      </div>
      <div className="bb-scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`store-skel-${i}`}
                className="h-[148px] min-w-[168px] shrink-0 animate-pulse rounded-2xl bg-slate-200"
              />
            ))
          : stores.map((store) => (
              <StoreCardLink key={store.id} store={store} variant="carousel" />
            ))}
      </div>
    </section>
  );
}
