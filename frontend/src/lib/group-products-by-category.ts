import type { StorefrontProduct } from '@/types/storefront-product';

export type CategoryProductGroup = {
  categoryId: string | null;
  categoryName: string;
  categorySlug: string | null;
  categorySortOrder: number;
  products: StorefrontProduct[];
};

const UNCATEGORIZED_KEY = '__uncategorized__';

/** Groups loaded catalog items into category sections (preserves product order within each group). */
export function groupProductsByCategory(products: StorefrontProduct[]): CategoryProductGroup[] {
  const groups = new Map<string, CategoryProductGroup>();

  for (const product of products) {
    const key = product.categoryId ?? UNCATEGORIZED_KEY;
    let group = groups.get(key);
    if (!group) {
      group = {
        categoryId: product.categoryId ?? null,
        categoryName: product.categoryName?.trim() || 'Boshqa',
        categorySlug: product.categorySlug ?? null,
        categorySortOrder: product.categorySortOrder ?? 99999,
        products: [],
      };
      groups.set(key, group);
    }
    group.products.push(product);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.categorySortOrder !== b.categorySortOrder) {
      return a.categorySortOrder - b.categorySortOrder;
    }
    return a.categoryName.localeCompare(b.categoryName, 'uz');
  });
}
