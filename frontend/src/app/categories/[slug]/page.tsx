import type { Metadata } from 'next';
import CategoryProductsClientPage from './category-products-client';
import { absoluteUrl, getApiBaseUrl } from '@/lib/seo';
import { normalizeAssetUrl } from '@/lib/asset-url';

type Category = { slug: string; name: string; description?: string | null; imageUrl?: string | null };

export async function generateStaticParams() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/categories?active=true`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const categories: Category[] = await response.json();
    return categories.filter((item) => item.slug).map((item) => ({ slug: item.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let categoryName = 'Kategoriya';
  let imageUrl = absoluteUrl('/og-image.png');

  try {
    const response = await fetch(`${getApiBaseUrl()}/categories?active=true`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const categories: Category[] = await response.json();
      const category = categories.find((item) => item.slug === slug);
      if (category?.name) categoryName = category.name;
      if (category?.imageUrl) imageUrl = normalizeAssetUrl(category.imageUrl);
    }
  } catch {
    // noop
  }

  const title = `${categoryName} mahsulotlari`;
  const description = `${categoryName} bo'yicha yangi mahsulotlar va qulay narxlar.`;

  return {
    title,
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title,
      description,
      url: `/categories/${slug}`,
      images: [{ url: imageUrl }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function CategoryProductsPage() {
  return <CategoryProductsClientPage />;
}
