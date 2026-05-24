'use client';

import Link from 'next/link';
import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { mapStorefrontProductToCardProps } from '@/lib/storefront-product-card';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  products: StorefrontProduct[];
  loading?: boolean;
};

function PromoItem({ product, priorityImage }: { product: StorefrontProduct; priorityImage: boolean }) {
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

const PromoItemMemo = memo(PromoItem);

export function HomePromotionsCarousel({ products, loading }: Props) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-5" aria-labelledby="home-promotions-heading">
      <div className="flex items-center justify-between px-0.5">
        <h2 id="home-promotions-heading" className="text-base font-semibold text-[#0f172a]">
          Aksiya va chegirmalar
        </h2>
        <Link
          href="/discounts"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-[#8B5CF6]"
        >
          Barchasi
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      </div>
      <div className="bb-scrollbar-hide -mx-0.5 mt-3 flex gap-2.5 overflow-x-auto pb-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`promo-skel-${i}`}
                className="min-w-[140px] shrink-0 overflow-hidden rounded-[18px] bg-white p-2"
              >
                <div className="bb-skeleton aspect-square w-[130px] rounded-xl" />
              </div>
            ))
          : products.map((product, idx) => (
              <div key={product.listingId ?? product.id} className="min-w-[140px] shrink-0">
                <PromoItemMemo product={product} priorityImage={idx < 3} />
              </div>
            ))}
      </div>
    </section>
  );
}
