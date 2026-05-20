CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
  ON "Order" ("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Order_createdAt_idx"
  ON "Order" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Product_storefront_idx"
  ON "Product" ("isActive", "categoryId", "createdAt" DESC)
  WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ProductVariant_title_trgm_idx"
  ON "ProductVariant" USING gin ("title" gin_trgm_ops);
