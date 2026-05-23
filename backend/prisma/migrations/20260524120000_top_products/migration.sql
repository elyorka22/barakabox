-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isTopProduct" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "topOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "topBadge" TEXT;

-- CreateIndex
CREATE INDEX "Product_isTopProduct_topOrder_idx" ON "Product"("isTopProduct", "topOrder");
