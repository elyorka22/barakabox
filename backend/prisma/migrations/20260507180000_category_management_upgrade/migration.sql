-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Category"
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");
