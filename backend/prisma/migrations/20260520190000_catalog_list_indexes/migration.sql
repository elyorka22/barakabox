CREATE INDEX IF NOT EXISTS "Product_isActive_createdAt_idx"
  ON "Product" ("isActive", "createdAt" DESC)
  WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "Product_categoryId_isActive_idx"
  ON "Product" ("categoryId", "isActive")
  WHERE "isActive" = true;
