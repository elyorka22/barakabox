'use client';

import Link from 'next/link';
import {
  DEFAULT_PRODUCT_UNIT,
  normalizeIncomingProductUnit,
  resolveSellingMode,
} from '@onlinebozor/product-units';
import { ProductCardCartControl } from '@/components/product-card/product-card-cart-control';
import type { StorefrontProduct } from '@/types/storefront-product';

type Props = {
  product: StorefrontProduct;
};

export function ProductSheetCartFooter({ product }: Props) {
  const variants = product.variants ?? [];
  const variant = variants[0];
  const unit = normalizeIncomingProductUnit(product.unit) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = resolveSellingMode({ sellingMode: product.sellingMode, unit });
  const outOfStock = (product.stock ?? variant?.stock ?? 0) <= 0;

  if (product.purchasable === false) {
    return (
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-center text-sm text-amber-800">Tez orada sotuvda</p>
        {product.storeSlug ? (
          <Link
            href={`/stores/${product.storeSlug}`}
            className="mt-2 block text-center text-xs font-semibold text-emerald-700"
          >
            {product.storeName ?? 'Do‘kon'} sahifasiga
          </Link>
        ) : null}
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-center text-sm text-slate-500">Variant topilmadi</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        {outOfStock ? 'Tugagan' : 'Savatga qoʻshish'}
      </p>
      <ProductCardCartControl
        variantId={variant.id}
        productId={product.id}
        sellingMode={sellingMode}
        unit={unit}
        disabled={outOfStock}
        storeId={product.storeId}
        storeName={product.storeName}
        storeSlug={product.storeSlug}
        listingId={product.listingId}
      />
    </div>
  );
}
