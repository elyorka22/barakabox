-- Product selling step overrides (nullable; sellingMode defaults still apply)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stepAmount" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minimumAmount" INTEGER;

-- Homepage delivery promo banner (singleton row)
CREATE TABLE IF NOT EXISTS "HomepageBanner" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT,
    "freeDeliveryAmount" INTEGER NOT NULL DEFAULT 50000,
    "backgroundColor" TEXT NOT NULL DEFAULT '#F2E5CC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBanner_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HomepageBanner" ("id", "title", "subtitle", "freeDeliveryAmount", "backgroundColor", "isActive", "updatedAt")
VALUES (
  'default',
  '50 000 so''mdan boshlab bepul yetkazib berish',
  'Tezkor delivery xizmati har kuni 24/7',
  50000,
  '#F2E5CC',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
