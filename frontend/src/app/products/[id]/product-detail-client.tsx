'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';
import { absoluteUrl } from '@/lib/seo';
import { SafeImage } from '@/components/safe-image';
import { incrementCart } from '@/lib/cart-store';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL_UZ,
  calculateSellingModeLineTotal,
  formatQuantityWithUnit,
  formatSellingModeQuantity,
  getSellingModeDecreaseDelta,
  getSellingModeMin,
  getSellingModeStep,
  normalizedProductSaleUnit,
  resolveSellingMode,
} from '@onlinebozor/product-units';

type Product = {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  description?: string | null;
  unit?: string | null;
  unitType?: string | null;
  sellingMode?: string | null;
  variants?: Array<{
    id: string;
    flavor?: string | null;
    description?: string | null;
    price: number;
    discountPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
};

export default function ProductDetailClientPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(() => getSellingModeMin('piece'));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const list = await api.get<Product[]>('/products');
      setProduct(list.find((p) => p.id === params.id) ?? null);
    };
    void load();
  }, [params.id]);

  const activeVariant = product?.variants?.[variantIndex] ?? null;
  const variants = product?.variants ?? [];
  const saleUnit = normalizedProductSaleUnit(product) ?? DEFAULT_PRODUCT_UNIT;
  const sellingMode = resolveSellingMode(product);

  useEffect(() => {
    setVariantIndex(0);
    setQuantity(getSellingModeMin(resolveSellingMode(product)));
  }, [product?.id, product]);

  useEffect(() => {
    setImageLoaded(false);
  }, [product?.imageUrl, activeVariant?.id, activeVariant?.imageUrl]);

  const goToVariant = (targetIndex: number) => {
    if (!variants.length) return;
    setVariantIndex(Math.max(0, Math.min(targetIndex, variants.length - 1)));
  };

  const handleTouchEnd = (touchEndX: number) => {
    if (touchStartX === null || variants.length <= 1) return;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 30) {
      setTouchStartX(null);
      return;
    }
    if (diff > 0) {
      goToVariant(variantIndex + 1);
    } else {
      goToVariant(variantIndex - 1);
    }
    setTouchStartX(null);
  };

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const basePrice = Number(activeVariant?.price ?? product.price);
    const salePrice =
      activeVariant?.discountPrice &&
      Number(activeVariant.discountPrice) > 0 &&
      Number(activeVariant.discountPrice) < basePrice
        ? Number(activeVariant.discountPrice)
        : null;
    return salePrice ?? basePrice;
  }, [product, activeVariant?.price, activeVariant?.discountPrice]);

  const total = useMemo(
    () => calculateSellingModeLineTotal(unitPrice, quantity, sellingMode),
    [unitPrice, quantity, sellingMode],
  );

  const quantityStep = getSellingModeStep(sellingMode);
  const quantityMin = getSellingModeMin(sellingMode);

  const decreaseQuantity = () => {
    setQuantity((q) => {
      const delta = getSellingModeDecreaseDelta(q, sellingMode);
      const next = q + delta;
      return next < quantityMin ? quantityMin : next;
    });
  };

  const increaseQuantity = () => {
    setQuantity((q) => q + quantityStep);
  };

  const addToCart = () => {
    if (!product || !activeVariant?.id) return;
    incrementCart(activeVariant.id, product.id, quantity);
  };

  const breadcrumbLd = useMemo(
    () =>
      product
        ? {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Bosh sahifa',
                item: absoluteUrl('/'),
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Mahsulotlar',
                item: absoluteUrl('/'),
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: product.name,
                item: absoluteUrl(`/products/${product.id}`),
              },
            ],
          }
        : null,
    [product],
  );

  const productLd = useMemo(() => {
    if (!product) return null;
    const basePrice = Number(activeVariant?.price ?? product.price ?? 0);
    const finalPrice =
      activeVariant?.discountPrice &&
      Number(activeVariant.discountPrice) > 0 &&
      Number(activeVariant.discountPrice) < basePrice
        ? Number(activeVariant.discountPrice)
        : basePrice;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [activeVariant?.imageUrl ?? product.imageUrl ?? absoluteUrl('/og-image.png')],
      description: activeVariant?.description || product.description || `${product.name} mahsuloti`,
      sku: activeVariant?.id || product.id,
      offers: {
        '@type': 'Offer',
        url: absoluteUrl(`/products/${product.id}`),
        priceCurrency: 'UZS',
        price: String(finalPrice),
        availability:
          Number(activeVariant?.stock ?? 0) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    };
  }, [activeVariant?.description, activeVariant?.discountPrice, activeVariant?.id, activeVariant?.imageUrl, activeVariant?.stock, activeVariant?.price, product]);

  return (
    <main className="bb-page">
      {breadcrumbLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      ) : null}
      {productLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
      ) : null}
      <section className="bb-shell">
        <Link href="/" className="text-sm text-gray-500">Orqaga</Link>
        {(activeVariant?.imageUrl ?? product?.imageUrl) ? (
          <div
            className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white"
            onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {!imageLoaded ? <div className="bb-skeleton absolute inset-0" /> : null}
            {variants.length > 0 ? (
              <div
                className="flex h-full w-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${variantIndex * 100}%)` }}
              >
                {variants.map((variant) => (
                  <div key={variant.id} className="h-full min-w-full">
                    <SafeImage
                      src={variant.imageUrl ?? undefined}
                      alt={variant.flavor ?? product?.name ?? 'Product'}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain object-center"
                      fallbackClassName="h-full w-full bg-gradient-to-br from-green-200 to-green-100"
                      onLoad={() => setImageLoaded(true)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <SafeImage
                src={product?.imageUrl ?? undefined}
                alt={product?.name ?? 'Product'}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain object-center"
                fallbackClassName="h-full w-full bg-gradient-to-br from-green-200 to-green-100"
                onLoad={() => setImageLoaded(true)}
              />
            )}
            {variants.length > 1 ? (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {variants.map((variant, idx) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => goToVariant(idx)}
                    className={`h-1.5 w-1.5 rounded-full ${idx === variantIndex ? 'bg-[#16A34A]' : 'bg-slate-300'}`}
                  >
                    <span className="sr-only">{`Variant ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 aspect-[4/3] rounded-3xl bg-gradient-to-br from-green-200 to-green-100" />
        )}
        <h1 className="mt-4 text-2xl font-bold text-[#121212]">{product?.name ?? 'Mahsulot'}</h1>
        {activeVariant?.flavor ? <p className="mt-1 text-sm font-medium text-slate-700">{activeVariant.flavor}</p> : null}
        <p className="mt-1 text-sm text-gray-500">⭐ 4.8 • Yangi va sifatli mahsulot</p>
        {(() => {
          const basePrice = Number(activeVariant?.price ?? product?.price ?? 0);
          const salePrice =
            activeVariant?.discountPrice &&
            Number(activeVariant.discountPrice) > 0 &&
            Number(activeVariant.discountPrice) < basePrice
              ? Number(activeVariant.discountPrice)
              : null;
          if (salePrice) {
            return (
              <div className="mt-2 flex flex-col">
                <p className="text-sm font-medium leading-none text-slate-400 line-through opacity-80">
                  {formatMoneyUz(basePrice)}
                </p>
                <p className="mt-1 text-2xl font-bold leading-tight tracking-tight text-[#121212] tabular-nums">
                  {formatMoneyUz(salePrice)}
                </p>
              </div>
            );
          }
          return (
            <p className="mt-2 text-2xl font-bold leading-tight tracking-tight text-[#121212] tabular-nums">
              {formatMoneyUz(basePrice)}
            </p>
          );
        })()}
        <p className="mt-0.5 text-xs font-medium text-slate-500">/ {PRODUCT_UNIT_LABEL_UZ[saleUnit]}</p>
        <p className={`mt-1 text-xs font-medium ${Number(activeVariant?.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {Number(activeVariant?.stock ?? 0) > 0
            ? `Mavjud: ${formatQuantityWithUnit(Number(activeVariant?.stock ?? 0), saleUnit)}`
            : 'Hozircha mavjud emas'}
        </p>
        {activeVariant?.description ? (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{activeVariant.description}</p>
        ) : null}
        {product?.variants?.length ? (
          <div className="bb-scrollbar-hide mt-3 flex gap-2 overflow-x-auto">
            {product.variants.map((variant, idx) => (
              <button
                key={variant.id}
                className={`rounded-full px-3 py-1 text-xs ${
                  idx === variantIndex ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setVariantIndex(idx)}
              >
                {variant.flavor ?? `Variant ${idx + 1}`}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex w-fit items-center gap-4 rounded-2xl bg-white px-4 py-2 shadow-sm">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-bold active:scale-95 disabled:opacity-40"
            onClick={decreaseQuantity}
            disabled={quantity <= quantityMin}
          >
            -
          </button>
          <span className="min-w-[5rem] text-center text-base font-semibold">
            {formatSellingModeQuantity(quantity, sellingMode, saleUnit)}
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white active:scale-95"
            onClick={increaseQuantity}
          >
            +
          </button>
        </div>
        <div
          className="fixed inset-x-0 z-20 bg-white p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]"
          style={{
            bottom: 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))',
          }}
        >
          <button onClick={addToCart} disabled={!product} className="w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60">
            {`Savatga qo'shish • ${formatMoneyUz(total)}`}
          </button>
        </div>
      </section>
      <MobileNav />
    </main>
  );
}

