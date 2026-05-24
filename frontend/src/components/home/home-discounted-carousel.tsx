'use client';

import Link from 'next/link';
import { SafeImage } from '@/components/safe-image';
import { formatMoneyUz } from '@/lib/format';
import { resolveProductSalePricing } from '@/lib/promotion-product';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  products: StorefrontProduct[];
  loading?: boolean;
  onOpen: (product: StorefrontProduct) => void;
};

export function HomeDiscountedCarousel({ products, loading, onOpen }: Props) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-5 rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#F43F5E] p-3 text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)]">
      <h2 className="text-base font-semibold">Aksiya va chegirmalar</h2>
      <div className="bb-scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="min-w-[130px] rounded-2xl bg-white p-2">
                <div className="bb-skeleton h-20 w-full rounded-xl" />
              </div>
            ))
          : products.map((product) => {
              const variant = product.variants?.[0];
              const { basePrice, salePrice, discountPercent } = resolveProductSalePricing(product);
              const displayPrice = salePrice ?? basePrice;
              return (
                <button
                  key={product.listingId ?? product.id}
                  type="button"
                  onClick={() => onOpen(product)}
                  className="relative min-w-[140px] rounded-2xl bg-white p-2 text-left text-[#111111] transition active:scale-[0.98]"
                >
                  {discountPercent > 0 ? (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      -{discountPercent}%
                    </span>
                  ) : null}
                  <div className="relative h-20 overflow-hidden rounded-xl bg-white">
                    <SafeImage
                      src={variant?.imageUrl ?? product.imageCardUrl ?? product.imageUrl ?? undefined}
                      alt={product.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      sizes="140px"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-semibold">{product.name}</p>
                  {salePrice !== null && salePrice < basePrice ? (
                    <p className="text-[10px] text-slate-400 line-through">{formatMoneyUz(basePrice)}</p>
                  ) : null}
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-[#121212]">
                    {formatMoneyUz(displayPrice)}
                  </p>
                </button>
              );
            })}
      </div>
      <Link
        href="/discounts"
        className="mt-2 flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#111111]"
      >
        <span>Barcha aksiyalar</span>
        <span>›</span>
      </Link>
    </section>
  );
}
