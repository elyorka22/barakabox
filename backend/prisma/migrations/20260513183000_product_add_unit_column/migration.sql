-- Product sale unit: canonical column "unit" (enum ProductUnit).
-- Safe for DBs that never had "unitType" and for DBs that still have legacy "unitType".

CREATE TYPE "ProductUnit" AS ENUM (
  'dona',
  'kg',
  'gramm',
  'litr',
  'ml',
  'quti',
  'karobka',
  'toplam'
);

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unit" "ProductUnit";

-- Backfill from legacy "unitType" when that column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name = 'unitType'
  ) THEN
    UPDATE "Product"
    SET "unit" = (
      CASE "unitType"::text
        WHEN 'dona' THEN 'dona'::"ProductUnit"
        WHEN 'kg' THEN 'kg'::"ProductUnit"
        WHEN 'gramm' THEN 'gramm'::"ProductUnit"
        WHEN 'litr' THEN 'litr'::"ProductUnit"
        WHEN 'ml' THEN 'ml'::"ProductUnit"
        WHEN 'quti' THEN 'quti'::"ProductUnit"
        WHEN 'karobka' THEN 'karobka'::"ProductUnit"
        WHEN 'toplam' THEN 'toplam'::"ProductUnit"
        WHEN 'paket' THEN 'quti'::"ProductUnit"
        WHEN 'bog' THEN 'toplam'::"ProductUnit"
        WHEN 'pack' THEN 'karobka'::"ProductUnit"
        WHEN 'piece' THEN 'dona'::"ProductUnit"
        ELSE 'dona'::"ProductUnit"
      END
    );
  ELSE
    UPDATE "Product" SET "unit" = 'dona'::"ProductUnit" WHERE "unit" IS NULL;
  END IF;
END $$;

ALTER TABLE "Product" ALTER COLUMN "unit" SET DEFAULT 'dona'::"ProductUnit";
ALTER TABLE "Product" ALTER COLUMN "unit" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name = 'unitType'
  ) THEN
    ALTER TABLE "Product" DROP COLUMN "unitType";
  END IF;
END $$;
