import type { Metadata } from 'next';
import { ProductRedirectClient } from './product-redirect-client';
import { absoluteUrl, getApiBaseUrl } from '@/lib/seo';
import { normalizeAssetUrl } from '@/lib/asset-url';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  updatedAt?: string;
};

export async function generateStaticParams() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/products?page=1&limit=2000`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const payload: Product[] | { items?: Product[] } = await response.json();
    const products = Array.isArray(payload) ? payload : payload.items ?? [];
    return products.filter((item) => item.id).map((item) => ({ id: item.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let product: Product | null = null;
  try {
    const response = await fetch(`${getApiBaseUrl()}/products?page=1&limit=5000`, {
      next: { revalidate: 1800 },
    });
    if (response.ok) {
      const payload: Product[] | { items?: Product[] } = await response.json();
      const products = Array.isArray(payload) ? payload : payload.items ?? [];
      product = products.find((item) => item.id === id) ?? null;
    }
  } catch {
    // noop
  }

  const title = product?.name ? `${product.name} - sotib oling` : 'Mahsulot tafsiloti';
  const description = product?.description || "Mahsulot haqida batafsil ma'lumot va narxlar.";
  const imageUrl = product?.imageUrl ? normalizeAssetUrl(product.imageUrl) : absoluteUrl('/og-image.png');

  return {
    title,
    description,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/products/${id}`,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ProductDetailPage() {
  return <ProductRedirectClient />;
}
