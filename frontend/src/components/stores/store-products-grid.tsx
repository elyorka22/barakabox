'use client';

import { useEffect } from 'react';
import { ProductCard } from '@/components/product-card';
import { mapStorefrontProductToCardProps } from '@/lib/storefront-product-card';
import { useProductSheet } from '@/lib/product-sheet-context';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  products: StorefrontProduct[];
  storeName: string;
};

export function StoreProductsGrid({ products, storeName }: Props) {
  const { openProduct, registerCatalog } = useProductSheet();

  if (products.length === 0) {
    return <p className="px-4 text-sm text-slate-500">Mahsulot yoʻq</p>;
  }

  useEffect(() => {
    registerCatalog(products);
  }, [products, registerCatalog]);

  return (
    <ul className="catalog-grid px-4">
      {products.map((product, idx) => {
        const cardProps = mapStorefrontProductToCardProps(product, { grid: true });
        const canOpen = product.purchasable !== false;
        return (
          <li key={product.listingId ?? product.id}>
            <div
              className={canOpen ? 'cursor-pointer' : ''}
              onClick={() => {
                if (canOpen) void openProduct(product);
              }}
              role={canOpen ? 'presentation' : undefined}
            >
              <ProductCard {...cardProps} imagePriority={idx < 4} />
              {product.purchasable === false ? (
                <p className="mt-1 text-center text-[10px] font-medium text-amber-700">Tez orada</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
