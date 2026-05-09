import type { MetadataRoute } from "next";
import { getApiBaseUrl, getSiteUrl } from "@/lib/seo";

type Category = { slug: string; updatedAt?: string };
type Product = { id: string; updatedAt?: string };

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const apiBase = getApiBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/categories`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/discounts`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/profile`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${siteUrl}/client`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ];

  try {
    const [categoriesRes, productsRes] = await Promise.all([
      fetch(`${apiBase}/categories?active=true`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/products?page=1&limit=5000`, { next: { revalidate: 3600 } }),
    ]);

    const categories: Category[] = categoriesRes.ok ? await categoriesRes.json() : [];
    const productsJson: Product[] | { items?: Product[] } = productsRes.ok ? await productsRes.json() : [];
    const products = Array.isArray(productsJson) ? productsJson : productsJson.items ?? [];

    const categoryRoutes: MetadataRoute.Sitemap = categories
      .filter((item) => Boolean(item.slug))
      .map((item) => ({
        url: `${siteUrl}/categories/${item.slug}`,
        lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
        changeFrequency: "daily",
        priority: 0.85,
      }));

    const productRoutes: MetadataRoute.Sitemap = products
      .filter((item) => Boolean(item.id))
      .map((item) => ({
        url: `${siteUrl}/products/${item.id}`,
        lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
        changeFrequency: "daily",
        priority: 0.8,
      }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}

