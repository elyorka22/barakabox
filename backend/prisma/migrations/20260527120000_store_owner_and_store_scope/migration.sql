-- Stage 2: STORE_OWNER role + store-scoped staff (pickers)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    INNER JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'STORE_OWNER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'STORE_OWNER';
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storeScopeId" TEXT;

CREATE INDEX IF NOT EXISTS "User_storeScopeId_idx" ON "User"("storeScopeId");

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_storeScopeId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_storeScopeId_fkey"
  FOREIGN KEY ("storeScopeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
