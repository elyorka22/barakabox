-- Unified public order number (backfilled on app startup if null).
ALTER TABLE "Order" ADD COLUMN "orderNumber" TEXT;

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
