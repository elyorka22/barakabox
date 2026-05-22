-- Scheduled / pre-order delivery
CREATE TYPE "DeliveryType" AS ENUM ('INSTANT', 'SCHEDULED');

ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_SCHEDULE';

ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "scheduledOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "scheduleSlotMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "scheduleWorkStartHour" INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS "scheduleWorkEndHour" INTEGER NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS "scheduleMinDelayMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "scheduleMaxOrdersPerSlot" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "schedulePrepLeadMinutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "deliveryType" "DeliveryType" NOT NULL DEFAULT 'INSTANT',
  ADD COLUMN IF NOT EXISTS "isScheduled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scheduledSlotEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliverySlot" TEXT;

CREATE INDEX IF NOT EXISTS "Order_scheduledAt_idx" ON "Order" ("scheduledAt");
CREATE INDEX IF NOT EXISTS "Order_status_scheduledAt_idx" ON "Order" ("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Order_deliveryType_idx" ON "Order" ("deliveryType");
