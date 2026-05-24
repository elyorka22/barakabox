-- Global catalog: default sale unit on platform products.
ALTER TABLE "GlobalProduct" ADD COLUMN "unit" "ProductUnit" NOT NULL DEFAULT 'dona';
