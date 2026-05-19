-- BusinessStatus: add DISABLED
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'DISABLED';

-- BusinessProfile: merchant profile fields
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
