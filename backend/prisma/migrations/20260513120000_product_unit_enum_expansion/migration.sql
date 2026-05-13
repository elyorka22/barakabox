-- Migrate UnitType enum from legacy (kg, piece, pack) to marketplace units.
-- Add OrderItem.unitType snapshot for display on orders/picker.

CREATE TYPE "UnitType_new" AS ENUM (
  'dona',
  'kg',
  'gramm',
  'litr',
  'ml',
  'quti',
  'karobka',
  'paket',
  'toplam',
  'bog',
  'pack'
);

ALTER TABLE "Product" ALTER COLUMN "unitType" DROP DEFAULT;

ALTER TABLE "Product" ALTER COLUMN "unitType" TYPE "UnitType_new" USING (
  CASE "unitType"::text
    WHEN 'piece' THEN 'dona'
    WHEN 'kg' THEN 'kg'
    WHEN 'pack' THEN 'pack'
    ELSE 'dona'
  END
)::"UnitType_new";

ALTER TABLE "Product" ALTER COLUMN "unitType" SET DEFAULT 'dona'::"UnitType_new";

DROP TYPE "UnitType";

ALTER TYPE "UnitType_new" RENAME TO "UnitType";

ALTER TABLE "OrderItem" ADD COLUMN "unitType" "UnitType" NOT NULL DEFAULT 'dona';

UPDATE "OrderItem" oi
SET "unitType" = p."unitType"
FROM "Product" p
WHERE oi."productId" IS NOT NULL AND oi."productId" = p."id";

UPDATE "OrderItem" oi
SET "unitType" = p."unitType"
FROM "ProductVariant" v
JOIN "Product" p ON p."id" = v."productId"
WHERE oi."variantId" IS NOT NULL AND oi."variantId" = v."id";
