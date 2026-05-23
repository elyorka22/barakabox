'use client';

import Link from 'next/link';
import { SafeImage } from '@/components/safe-image';
import type { FeaturedStore } from '@/lib/marketplace-home';

type Props = {
  stores: FeaturedStore[];
};

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
          <Link
            key={store.id}
            href={`/stores/${store.slug}`}
            className="flex min-w-[120px] flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-[0_4px_14px_rgba(17,24,39,0.06)] active:scale-[0.98]"
          >
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-100">
              {store.logoUrl ? (
                <SafeImage
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-full w-full object-cover"
                  sizes="56px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl">🏪</span>
              )}
            </div>
            <p className="line-clamp-2 text-center text-xs font-semibold text-[#111827]">{store.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
