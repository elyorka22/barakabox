'use client';

import { memo } from 'react';
import { ProductCard } from '@/components/product-card';
import { mapStorefrontProductToCardProps } from '@/lib/storefront-product-card';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  products: StorefrontProduct[];
  loading?: boolean;
};

function PopularItem({ product, priorityImage }: { product: StorefrontProduct; priorityImage: boolean }) {
  const { openProduct } = useProductSheet();
  const cardProps = mapStorefrontProductToCardProps(product);
  const canOpen = product.purchasable !== false;

  return (
    <div
      className={canOpen ? 'cursor-pointer' : ''}
      onClick={() => {
        if (canOpen) void openProduct(product);
      }}
      role={canOpen ? 'presentation' : undefined}
    >
      <ProductCard {...cardProps} imagePriority={priorityImage} />
    </div>
  );
}

const PopularItemMemo = memo(PopularItem);

export function PopularProductsCarousel({ products, loading }: Props) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-5" aria-labelledby="home-popular-heading">
      <h2 id="home-popular-heading" className="px-0.5 text-base font-semibold text-[#0f172a]">
        Mashhur mahsulotlar
      </h2>
      <div className="bb-scrollbar-hide -mx-0.5 mt-3 flex gap-2.5 overflow-x-auto pb-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`pop-skel-${i}`}
                className="min-w-[140px] shrink-0 overflow-hidden rounded-[18px] bg-white p-2"
              >
                <div className="bb-skeleton aspect-square w-[130px] rounded-xl" />
              </div>
            ))
          : products.map((product, idx) => (
              <div key={product.listingId ?? product.id} className="min-w-[140px] shrink-0">
                <PopularItemMemo product={product} priorityImage={idx < 3} />
              </div>
            ))}
      </div>
    </section>
  );
}
