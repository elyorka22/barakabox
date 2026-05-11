'use client';

import Link from 'next/link';
import { memo } from 'react';

type CategoryCardProps = {
  href: string;
  name: string;
  imageUrl?: string | null;
  fallbackEmoji?: string;
};

function CategoryCardBase({ href, name, imageUrl, fallbackEmoji = '🛒' }: CategoryCardProps) {
  return (
    <Link
      href={href}
      aria-label={name}
      className="group flex h-full flex-col items-center justify-start gap-2 rounded-[22px] border border-[#DFF5E7] bg-white p-3 shadow-[0_4px_12px_rgba(34,197,94,0.06)] outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(34,197,94,0.14)] focus-visible:ring-2 focus-visible:ring-[#22C55E] active:scale-[0.97] active:shadow-[0_2px_8px_rgba(34,197,94,0.18)]"
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px] bg-[#DCFCE7]/45">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-active:scale-[1.04]"
          />
        ) : (
          <span className="text-2xl" aria-hidden="true">{fallbackEmoji}</span>
        )}
      </div>
      <p
        className="line-clamp-2 text-center text-[11px] font-medium leading-snug text-[#1F2937] sm:text-xs"
        title={name}
      >
        {name}
      </p>
    </Link>
  );
}

export const CategoryCard = memo(CategoryCardBase);

export function CategoryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col items-center gap-2 rounded-[22px] border border-[#DFF5E7] bg-white p-3 shadow-[0_4px_12px_rgba(34,197,94,0.06)]"
    >
      <div className="bb-skeleton aspect-square w-full rounded-[18px]" />
      <div className="bb-skeleton h-3 w-3/4 rounded-full" />
    </div>
  );
}
