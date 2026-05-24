'use client';

import Link from 'next/link';
import { STORE_TYPE_CARDS, storeTypeQuery } from '@/lib/store-types';

export function HomeStoreTypes() {
  return (
    <section className="mt-6" aria-labelledby="home-store-types-heading">
      <h2 id="home-store-types-heading" className="mb-3 px-0.5 text-base font-semibold text-[#111827]">
        Do‘kon turlari
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {STORE_TYPE_CARDS.map((item) => (
          <Link
            key={item.type}
            href={`/stores?type=${storeTypeQuery(item.type)}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-[0_4px_14px_rgba(17,24,39,0.06)] active:scale-[0.98]"
          >
            <span className="text-2xl" aria-hidden>
              {item.emoji}
            </span>
            <span className="line-clamp-2 text-center text-[11px] font-semibold text-[#111827]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
