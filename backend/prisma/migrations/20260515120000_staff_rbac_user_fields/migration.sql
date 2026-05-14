-- AlterEnum: add SUPER_ADMIN (PostgreSQL)
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

-- Promote legacy admin seed user to SUPER_ADMIN (idempotent)
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'admin@barakabox.local' AND role = 'ADMIN';
