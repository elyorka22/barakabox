'use client';

import { memo } from 'react';
import { ProductCard } from '@/components/product-card';
import { mapStorefrontProductToCardProps } from '@/lib/storefront-product-card';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  products: StorefrontProduct[];
  loading?: boolean;
};

function TopProductsCarouselBase({ products, loading }: Props) {
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="mt-5" aria-labelledby="home-top-products-heading">
      <h2 id="home-top-products-heading" className="px-0.5 text-base font-semibold text-[#0f172a]">
        🔥 Top mahsulotlar
      </h2>
      <div
        className="top-products-scroll bb-scrollbar-hide -mx-0.5 mt-3 flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 pt-0.5"
        role="list"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`top-skeleton-${idx}`}
                className="top-products-card-slot min-w-[152px] max-w-[152px] shrink-0 snap-start"
              >
                <div className="bb-skeleton aspect-[0.92] w-full rounded-2xl" />
              </div>
            ))
          : products.map((product) => (
              <div
                key={product.id}
                className="top-products-card-slot min-w-[152px] max-w-[152px] shrink-0 snap-start"
                role="listitem"
              >
                <ProductCard {...mapStorefrontProductToCardProps(product)} />
              </div>
            ))}
      </div>
    </section>
  );
}

export const TopProductsCarousel = memo(TopProductsCarouselBase);
