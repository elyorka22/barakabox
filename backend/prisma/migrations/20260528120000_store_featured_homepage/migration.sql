-- Stage 7: featured stores on homepage

ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Store_isFeatured_sortOrder_idx" ON "Store"("isFeatured", "sortOrder");
