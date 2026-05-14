-- Phone-based customers + per-product cashback + order snapshots

CREATE TYPE "CashbackType" AS ENUM ('NONE', 'PERCENT', 'FIXED_AMOUNT');
CREATE TYPE "CashbackTransactionType" AS ENUM ('EARNED', 'SPENT', 'EXPIRED', 'REFUND');
CREATE TYPE "CashbackTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "cashbackBalance" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CashbackTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" INTEGER NOT NULL,
    "type" "CashbackTransactionType" NOT NULL,
    "status" "CashbackTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashbackTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashbackTransaction_customerId_createdAt_idx" ON "CashbackTransaction"("customerId", "createdAt");
CREATE INDEX "CashbackTransaction_orderId_idx" ON "CashbackTransaction"("orderId");

ALTER TABLE "CashbackTransaction" ADD CONSTRAINT "CashbackTransaction_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashbackTransaction" ADD CONSTRAINT "CashbackTransaction_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "cashbackType" "CashbackType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Product" ADD COLUMN "cashbackValue" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Order" ADD COLUMN "cashbackRedeemTiyin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "cashbackEarnedSnapshotTiyin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "cashbackCreditedAt" TIMESTAMP(3);

CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "cashbackPendingTiyin" INTEGER NOT NULL DEFAULT 0;
