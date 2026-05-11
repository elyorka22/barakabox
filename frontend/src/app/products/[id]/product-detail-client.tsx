'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { MobileNav } from '@/components/app-nav';
import { absoluteUrl } from '@/lib/seo';
import { SafeImage } from '@/components/safe-image';

type Product = {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  description?: string | null;
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
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    setVariantIndex(0);
  }, [product?.id]);

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

  const total = useMemo(
    () => {
      if (!product) return 0;
      const basePrice = Number(activeVariant?.price ?? product.price);
      const salePrice =
        activeVariant?.discountPrice &&
        Number(activeVariant.discountPrice) > 0 &&
        Number(activeVariant.discountPrice) < basePrice
          ? Number(activeVariant.discountPrice)
          : null;
      return (salePrice ?? basePrice) * quantity;
    },
    [product, quantity, activeVariant?.price, activeVariant?.discountPrice],
  );

  const addToCart = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      await api.post(
        '/cart/items',
        { productId: product.id, variantId: activeVariant?.id, quantity },
        token,
      );
    } finally {
      setLoading(false);
    }
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
              <div className="mt-2 flex items-end gap-2">
                <p className="text-2xl font-bold text-[#121212]">{formatMoneyUz(salePrice)}</p>
                <p className="text-sm text-slate-400 line-through">{formatMoneyUz(basePrice)}</p>
              </div>
            );
          }
          return <p className="mt-2 text-2xl font-bold text-[#121212]">{formatMoneyUz(basePrice)}</p>;
        })()}
        <p className={`mt-1 text-xs font-medium ${Number(activeVariant?.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {Number(activeVariant?.stock ?? 0) > 0 ? `Mavjud: ${activeVariant?.stock} dona` : 'Hozircha mavjud emas'}
        </p>
        {activeVariant?.description ? (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{activeVariant.description}</p>
        ) : null}
        {product?.variants?.length ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
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
          <button className="text-xl font-bold" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
          <span className="text-base font-semibold">{quantity}</span>
          <button className="text-xl font-bold" onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>
        <div
          className="fixed inset-x-0 z-20 bg-white p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]"
          style={{
            bottom: 'calc(var(--bb-mobile-nav-height) + env(safe-area-inset-bottom))',
          }}
        >
          <button onClick={addToCart} disabled={loading || !product} className="w-full rounded-2xl bg-[#16A34A] py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Qo'shilmoqda..." : `Savatga qo'shish • ${formatMoneyUz(total)}`}
          </button>
        </div>
      </section>
      <MobileNav />
    </main>
  );
}

