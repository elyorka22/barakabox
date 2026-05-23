-- Stage 1: additive global catalog + stores (legacy Product / BusinessProfile unchanged)

CREATE TABLE "GlobalProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "brand" TEXT,
    "imageUrl" TEXT,
    "imageKey" TEXT,
    "imageCardUrl" TEXT,
    "imageCardKey" TEXT,
    "imageThumbUrl" TEXT,
    "imageThumbKey" TEXT,
    "imagesJson" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyProductId" TEXT,

    CONSTRAINT "GlobalProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GlobalVariant" (
    "id" TEXT NOT NULL,
    "globalProductId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sku" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyVariantId" TEXT,

    CONSTRAINT "GlobalVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "deliveryPrice" INTEGER NOT NULL DEFAULT 0,
    "minOrderPrice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerUserId" TEXT,
    "businessProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "globalProductId" TEXT NOT NULL,
    "globalVariantId" TEXT,
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "cashbackType" "CashbackType" NOT NULL DEFAULT 'NONE',
    "cashbackValue" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "topOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyProductId" TEXT,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlobalProduct_slug_key" ON "GlobalProduct"("slug");
CREATE UNIQUE INDEX "GlobalProduct_legacyProductId_key" ON "GlobalProduct"("legacyProductId");
CREATE INDEX "GlobalProduct_categoryId_idx" ON "GlobalProduct"("categoryId");
CREATE INDEX "GlobalProduct_isActive_idx" ON "GlobalProduct"("isActive");
CREATE INDEX "GlobalProduct_name_idx" ON "GlobalProduct"("name");

CREATE UNIQUE INDEX "GlobalVariant_legacyVariantId_key" ON "GlobalVariant"("legacyVariantId");
CREATE INDEX "GlobalVariant_globalProductId_isActive_idx" ON "GlobalVariant"("globalProductId", "isActive");
CREATE INDEX "GlobalVariant_sku_idx" ON "GlobalVariant"("sku");
CREATE UNIQUE INDEX "GlobalVariant_globalProductId_type_value_key" ON "GlobalVariant"("globalProductId", "type", "value");

CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE UNIQUE INDEX "Store_businessProfileId_key" ON "Store"("businessProfileId");
CREATE INDEX "Store_isActive_idx" ON "Store"("isActive");
CREATE INDEX "Store_ownerUserId_idx" ON "Store"("ownerUserId");

CREATE UNIQUE INDEX "StoreProduct_legacyProductId_key" ON "StoreProduct"("legacyProductId");
CREATE INDEX "StoreProduct_storeId_isVisible_idx" ON "StoreProduct"("storeId", "isVisible");
CREATE INDEX "StoreProduct_storeId_isTop_topOrder_idx" ON "StoreProduct"("storeId", "isTop", "topOrder");
CREATE INDEX "StoreProduct_globalProductId_idx" ON "StoreProduct"("globalProductId");
CREATE INDEX "StoreProduct_globalVariantId_idx" ON "StoreProduct"("globalVariantId");

-- One listing per store + product when no variant is selected.
CREATE UNIQUE INDEX "StoreProduct_store_global_product_base_idx"
  ON "StoreProduct"("storeId", "globalProductId")
  WHERE "globalVariantId" IS NULL;

-- One listing per store + product + variant.
CREATE UNIQUE INDEX "StoreProduct_store_global_product_variant_idx"
  ON "StoreProduct"("storeId", "globalProductId", "globalVariantId")
  WHERE "globalVariantId" IS NOT NULL;

ALTER TABLE "GlobalProduct" ADD CONSTRAINT "GlobalProduct_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GlobalVariant" ADD CONSTRAINT "GlobalVariant_globalProductId_fkey"
  FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Store" ADD CONSTRAINT "Store_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Store" ADD CONSTRAINT "Store_businessProfileId_fkey"
  FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_globalProductId_fkey"
  FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_globalVariantId_fkey"
  FOREIGN KEY ("globalVariantId") REFERENCES "GlobalVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
