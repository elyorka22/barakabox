-- Runs after marketplace_catalog_foundation (20260526200000).
-- Idempotent: safe if an earlier mis-ordered migration attempt failed on deploy.

ALTER TABLE "GlobalProduct" ADD COLUMN IF NOT EXISTS "unit" "ProductUnit" NOT NULL DEFAULT 'dona';

ALTER TABLE "GlobalProduct" ADD COLUMN IF NOT EXISTS "attributes" JSONB NOT NULL DEFAULT '{}';
