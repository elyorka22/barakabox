-- Store showcase: description, delivery ETA, rating for homepage cards.
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "deliveryTimeMinutes" INTEGER;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Store_createdAt_idx" ON "Store"("createdAt");
CREATE INDEX IF NOT EXISTS "Store_isFeatured_sortOrder_idx" ON "Store"("isFeatured", "sortOrder");
