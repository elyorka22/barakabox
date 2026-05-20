-- Add promotion and discount fields to products
CREATE TYPE "PromotionBadge" AS ENUM ('HOT', 'TOP', 'YANGI', 'AKSIYA', 'PREMIUM');

ALTER TABLE "Product"
ADD COLUMN "discountEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discountedPrice" INTEGER,
ADD COLUMN "promotionBadge" "PromotionBadge",
ADD COLUMN "promotionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotionStartAt" TIMESTAMP(3),
ADD COLUMN "promotionEndAt" TIMESTAMP(3);
