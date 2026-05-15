-- Courier reject log + shift tracking
CREATE TABLE IF NOT EXISTS "CourierOrderReject" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierOrderReject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CourierShift" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CourierShift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CourierOrderReject_courierId_createdAt_idx" ON "CourierOrderReject"("courierId", "createdAt");
CREATE INDEX IF NOT EXISTS "CourierOrderReject_orderId_courierId_idx" ON "CourierOrderReject"("orderId", "courierId");
CREATE INDEX IF NOT EXISTS "CourierShift_courierId_startedAt_idx" ON "CourierShift"("courierId", "startedAt");
CREATE INDEX IF NOT EXISTS "CourierShift_courierId_endedAt_idx" ON "CourierShift"("courierId", "endedAt");

ALTER TABLE "CourierOrderReject" DROP CONSTRAINT IF EXISTS "CourierOrderReject_courierId_fkey";
ALTER TABLE "CourierOrderReject" ADD CONSTRAINT "CourierOrderReject_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourierOrderReject" DROP CONSTRAINT IF EXISTS "CourierOrderReject_orderId_fkey";
ALTER TABLE "CourierOrderReject" ADD CONSTRAINT "CourierOrderReject_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourierShift" DROP CONSTRAINT IF EXISTS "CourierShift_courierId_fkey";
ALTER TABLE "CourierShift" ADD CONSTRAINT "CourierShift_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
