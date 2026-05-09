import type { MetadataRoute } from "next";
import { getApiBaseUrl, getSiteUrl } from "@/lib/seo";

type CategoryEntry = { slug: string; updatedAt?: string };
type ProductEntry = { id: string; updatedAt?: string };

export const revalidate = 3600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCategories(json: unknown): CategoryEntry[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (row): row is CategoryEntry =>
      isRecord(row) && typeof row.slug === "string" && row.slug.length > 0,
  );
}

function parseProducts(json: unknown): ProductEntry[] {
  if (Array.isArray(json)) {
    return json.filter(
      (row): row is ProductEntry =>
        isRecord(row) && typeof row.id === "string" && row.id.length > 0,
    );
  }
  if (isRecord(json) && Array.isArray(json.items)) {
    return parseProducts(json.items);
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const apiBase = getApiBaseUrl();
  const now = new Date();

  const coreRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${siteUrl}/categories`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const [categoriesRes, productsRes] = await Promise.all([
      fetch(`${apiBase}/categories?active=true`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/products`, { next: { revalidate: 3600 } }),
    ]);

    const categoriesJson: unknown = categoriesRes.ok ? await categoriesRes.json() : [];
    const productsJson: unknown = productsRes.ok ? await productsRes.json() : [];

    const categories = parseCategories(categoriesJson);
    const products = parseProducts(productsJson);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((item) => ({
      url: `${siteUrl}/categories/${item.slug}`,
      lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((item) => ({
      url: `${siteUrl}/products/${item.id}`,
      lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    return [...coreRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return coreRoutes;
  }
}
