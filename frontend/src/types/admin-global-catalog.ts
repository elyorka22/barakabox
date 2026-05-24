export type GlobalCatalogVariant = {
  id: string;
  type: string;
  value: string;
  imageUrl: string | null;
  sku: string | null;
  sortOrder: number;
};

export type GlobalCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  unit: string;
  imagesJson?: unknown;
  attributes?: Record<string, unknown> | null;
  imageUrl: string | null;
  imageCardUrl: string | null;
  imageThumbUrl: string | null;
  isActive: boolean;
  categoryId: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  variants: GlobalCatalogVariant[];
};

export type GlobalCatalogListResponse = {
  items: GlobalCatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type GlobalProductFormState = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  categoryId: string;
  unit: string;
  imageUrl: string;
  imageKey: string;
  isActive: boolean;
};

export type GlobalVariantFormState = {
  type: string;
  value: string;
  sku: string;
  imageUrl: string;
  imageKey: string;
};
