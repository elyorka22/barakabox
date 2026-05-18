-- Add explicit selling mode to Product so admins decide piece / gram_step / kilogram_step
-- independently of the price-label `unit`. Backfills existing rows with safe defaults.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SellingMode') THEN
    CREATE TYPE "SellingMode" AS ENUM ('PIECE', 'GRAM_STEP', 'KILOGRAM_STEP');
  END IF;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "sellingMode" "SellingMode" NOT NULL DEFAULT 'PIECE';

-- Backfill:
--   kg     -> KILOGRAM_STEP (most weighted produce: potato, onion, watermelon, …)
--   gramm  -> GRAM_STEP     (dry fruits, nuts, premium meat, cheese, …)
--   others -> PIECE         (drinks, bread, eggs, boxes, …)
UPDATE "Product"
SET "sellingMode" = CASE
  WHEN "unit" = 'kg'    THEN 'KILOGRAM_STEP'::"SellingMode"
  WHEN "unit" = 'gramm' THEN 'GRAM_STEP'::"SellingMode"
  ELSE 'PIECE'::"SellingMode"
END;

-- Add the same column to OrderItem to snapshot how the line was sold at the time.
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "sellingMode" "SellingMode" NOT NULL DEFAULT 'PIECE';

-- Backfill historical order lines.
-- Legacy carts stored grams under unitType='kg' (quantity could be up to ~5000),
-- so existing kg lines must keep GRAM_STEP semantics to render correctly.
UPDATE "OrderItem"
SET "sellingMode" = CASE
  WHEN "unitType" = 'kg'    THEN 'GRAM_STEP'::"SellingMode"
  WHEN "unitType" = 'gramm' THEN 'GRAM_STEP'::"SellingMode"
  ELSE 'PIECE'::"SellingMode"
END;
