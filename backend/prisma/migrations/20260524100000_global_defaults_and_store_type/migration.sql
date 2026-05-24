-- Global catalog defaults for fast store onboarding + store vertical type.
DO $$ BEGIN
  CREATE TYPE "StoreType" AS ENUM ('GROCERY', 'PHARMACY', 'PET', 'BABY', 'ELECTRONICS', 'COSMETICS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "GlobalProduct" ADD COLUMN IF NOT EXISTS "defaultPrice" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GlobalProduct" ADD COLUMN IF NOT EXISTS "defaultStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GlobalProduct" ADD COLUMN IF NOT EXISTS "isPopular" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "GlobalProduct_isPopular_idx" ON "GlobalProduct"("isPopular");

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "storeType" "StoreType" NOT NULL DEFAULT 'GROCERY';

CREATE INDEX IF NOT EXISTS "Store_storeType_idx" ON "Store"("storeType");
