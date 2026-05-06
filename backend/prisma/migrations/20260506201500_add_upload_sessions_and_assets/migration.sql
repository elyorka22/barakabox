CREATE TABLE IF NOT EXISTS "ProductImageAsset" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "mainUrl" TEXT NOT NULL,
  "mainKey" TEXT NOT NULL,
  "cardUrl" TEXT NOT NULL,
  "cardKey" TEXT NOT NULL,
  "thumbUrl" TEXT NOT NULL,
  "thumbKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImageAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductImageAsset_productId_createdAt_idx" ON "ProductImageAsset"("productId", "createdAt");

ALTER TABLE "ProductImageAsset"
  ADD CONSTRAINT "ProductImageAsset_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "UploadSession" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "mainUrl" TEXT NOT NULL,
  "mainKey" TEXT NOT NULL,
  "cardUrl" TEXT NOT NULL,
  "cardKey" TEXT NOT NULL,
  "thumbUrl" TEXT NOT NULL,
  "thumbKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UploadSession_productId_key" ON "UploadSession"("productId");

ALTER TABLE "UploadSession"
  ADD CONSTRAINT "UploadSession_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
