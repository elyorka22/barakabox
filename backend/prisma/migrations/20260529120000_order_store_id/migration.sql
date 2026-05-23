-- Stage 13: attribute orders to marketplace store when checkout originates from storefront cart.
ALTER TABLE "Order" ADD COLUMN "storeId" TEXT;

CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
