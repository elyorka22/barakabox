-- Speed up marketplace promotions (visible listings with oldPrice)
CREATE INDEX IF NOT EXISTS "StoreProduct_isVisible_oldPrice_idx" ON "StoreProduct"("isVisible", "oldPrice");
