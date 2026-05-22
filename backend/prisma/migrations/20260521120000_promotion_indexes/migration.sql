-- Promotion / discount catalog indexes
CREATE INDEX IF NOT EXISTS "Product_discountEnabled_discountedPrice_idx"
  ON "Product" ("discountEnabled", "discountedPrice");

CREATE INDEX IF NOT EXISTS "Product_promotionEnabled_idx"
  ON "Product" ("promotionEnabled");

CREATE INDEX IF NOT EXISTS "ProductVariant_discountPrice_idx"
  ON "ProductVariant" ("discountPrice");
