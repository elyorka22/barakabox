-- AlterEnum: add SUPER_ADMIN (PostgreSQL).
-- Do not reference the new enum value in this migration: PostgreSQL requires the enum
-- change to be committed before SUPER_ADMIN can appear in UPDATE/INSERT (see next migration).
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- User staff / RBAC fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffLogin" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessScopeId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_staffLogin_key" ON "User"("staffLogin");

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_businessScopeId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_businessScopeId_fkey" FOREIGN KEY ("businessScopeId") REFERENCES "BusinessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
