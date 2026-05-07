-- CreateTable
CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "flavor" TEXT,
  "size" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "discountPrice" INTEGER,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "variantId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN "variantId" TEXT,
ADD COLUMN "variantSnapshotTitle" TEXT,
ADD COLUMN "variantSnapshotFlavor" TEXT,
ADD COLUMN "variantSnapshotSize" TEXT,
ADD COLUMN "variantSnapshotSku" TEXT;

-- Indexes
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_barcode_idx" ON "ProductVariant"("barcode");
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- Foreign keys
ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
ADD CONSTRAINT "CartItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing product gets one default variant
INSERT INTO "ProductVariant" (
  "id",
  "productId",
  "title",
  "description",
  "price",
  "stock",
  "imageUrl",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('pv_', "id"),
  "id",
  "name",
  "description",
  "price",
  "stockQuantity",
  "imageUrl",
  "isActive",
  0,
  NOW(),
  NOW()
FROM "Product";

-- Point cart items to default variant when product exists
UPDATE "CartItem" c
SET "variantId" = CONCAT('pv_', c."productId")
WHERE c."productId" IS NOT NULL;

-- Point order items to default variant and store snapshots
UPDATE "OrderItem" oi
SET
  "variantId" = CONCAT('pv_', oi."productId"),
  "variantSnapshotTitle" = oi."title"
WHERE oi."productId" IS NOT NULL;
