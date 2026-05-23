'use client';

import Link from 'next/link';
import { SafeImage } from '@/components/safe-image';
import { formatMoneyUz } from '@/lib/format';
import type { StoreSection } from '@/lib/marketplace-home';
import type { StorefrontProduct } from '@/types/storefront-product';
import { resolveProductSalePricing } from '@/lib/promotion-product';

type Props = {
  sections: StoreSection[];
  onOpen: (product: StorefrontProduct) => void;
};

export function StoreSections({ sections, onOpen }: Props) {
  if (sections.length === 0) return null;

  return (
    <div className="mt-6 space-y-5">
      {sections.map(({ store, products }) => (
        <section key={store.id} aria-labelledby={`store-${store.id}`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 id={`store-${store.id}`} className="text-base font-semibold text-[#111827]">
              {store.name}
            </h2>
            <Link
              href={`/stores/${store.slug}`}
              className="text-xs font-semibold text-emerald-700"
            >
              Barchasi
            </Link>
          </div>
          <div className="bb-scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {products.map((product) => {
              const { basePrice, salePrice } = resolveProductSalePricing(product);
              const displayPrice = salePrice ?? basePrice;
              return (
                <button
                  key={product.listingId ?? product.id}
                  type="button"
                  onClick={() => onOpen(product)}
                  className="min-w-[130px] rounded-2xl bg-white p-2 text-left shadow-[0_4px_14px_rgba(17,24,39,0.06)] active:scale-[0.98]"
                >
                  <div className="relative h-20 overflow-hidden rounded-xl bg-slate-50">
                    <SafeImage
                      src={product.imageCardUrl ?? product.imageUrl ?? undefined}
                      alt={product.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      sizes="130px"
                    />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-[#111827]">{product.name}</p>
                  <p className="text-sm font-bold tabular-nums">{formatMoneyUz(displayPrice)}</p>
                  {product.purchasable === false ? (
                    <p className="text-[10px] font-medium text-amber-700">Tez orada</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
