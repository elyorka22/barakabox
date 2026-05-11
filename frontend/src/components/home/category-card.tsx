'use client';

import Link from 'next/link';
import { memo } from 'react';
import { SafeImage } from '@/components/safe-image';

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
      className="group flex h-full flex-col items-center text-center outline-none focus-visible:outline-none"
    >
      <div
        className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[22px] border border-[#E8F5EC] bg-white p-2 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_22px_rgba(34,197,94,0.14)] group-active:scale-[0.96] group-active:shadow-[0_2px_8px_rgba(34,197,94,0.22)] group-focus-visible:ring-2 group-focus-visible:ring-[#22C55E] sm:p-3"
      >
        <SafeImage
          src={imageUrl ?? undefined}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-contain transition-transform duration-300 ease-out group-active:scale-[1.04]"
          fallbackClassName="flex h-full w-full items-center justify-center text-3xl"
          fallback={<span aria-hidden="true">{fallbackEmoji}</span>}
        />
      </div>
      <p
        className="mt-2 line-clamp-2 text-center text-[11px] font-semibold leading-snug text-[#1F2937] transition-colors duration-200 group-active:text-[#16A34A] sm:text-xs"
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
    <div aria-hidden="true" className="flex h-full flex-col items-center">
      <div className="bb-skeleton aspect-square w-full rounded-[22px]" />
      <div className="bb-skeleton mt-2 h-3 w-3/4 rounded-full" />
    </div>
  );
}
