-- Add PICKER role safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'PICKER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'PICKER';
  END IF;
END $$;

-- Add new enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UnitType') THEN
    CREATE TYPE "UnitType" AS ENUM ('kg', 'piece', 'pack');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryReason') THEN
    CREATE TYPE "InventoryReason" AS ENUM ('INCOME', 'SALE', 'ADJUSTMENT');
  END IF;
END $$;

-- Business profile fields
ALTER TABLE "BusinessProfile"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Product fields migration
ALTER TABLE "Product"
  RENAME COLUMN "stock" TO "stockQuantity";

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "unitType" "UnitType" NOT NULL DEFAULT 'piece';

-- Order status enum migration with data mapping
CREATE TYPE "OrderStatus_new" AS ENUM ('NEW', 'PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED');

ALTER TABLE "Order"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'NEW'
      WHEN 'PENDING' THEN 'NEW'
      WHEN 'ACCEPTED' THEN 'PICKING'
      WHEN 'CONFIRMED' THEN 'PICKING'
      WHEN 'READY' THEN 'READY'
      WHEN 'DELIVERING' THEN 'DELIVERING'
      WHEN 'COMPLETED' THEN 'DELIVERED'
      WHEN 'DELIVERED' THEN 'DELIVERED'
      WHEN 'REJECTED' THEN 'CANCELLED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'NEW'
    END
  )::"OrderStatus_new";

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "Order"
  ALTER COLUMN "status" SET DEFAULT 'NEW';

-- Order schema updates
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "assignedPickerId" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedCourierId" TEXT,
  ADD COLUMN IF NOT EXISTS "pickingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

UPDATE "Order"
SET
  "pickingAt" = COALESCE("pickingAt", "acceptedAt"),
  "deliveredAt" = COALESCE("deliveredAt", "completedAt");

ALTER TABLE "Order"
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Order"
  DROP CONSTRAINT IF EXISTS "Order_userId_fkey";

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_assignedPickerId_fkey"
  FOREIGN KEY ("assignedPickerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_assignedCourierId_fkey"
  FOREIGN KEY ("assignedCourierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  DROP COLUMN IF EXISTS "acceptedAt",
  DROP COLUMN IF EXISTS "completedAt";

-- Order item field rename
ALTER TABLE "OrderItem"
  RENAME COLUMN "unitPrice" TO "price";

-- Inventory log table
CREATE TABLE IF NOT EXISTS "InventoryLog" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId" TEXT,
  "change" INTEGER NOT NULL,
  "reason" "InventoryReason" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryLog_productId_createdAt_idx" ON "InventoryLog"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryLog_orderId_createdAt_idx" ON "InventoryLog"("orderId", "createdAt");

ALTER TABLE "InventoryLog"
  ADD CONSTRAINT "InventoryLog_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryLog"
  ADD CONSTRAINT "InventoryLog_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
