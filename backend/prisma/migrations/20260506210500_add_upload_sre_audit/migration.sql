DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UploadAuditAction') THEN
    CREATE TYPE "UploadAuditAction" AS ENUM ('PRESIGN', 'FINALIZE', 'DELETE', 'LEGACY_UPLOAD');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UploadAuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT,
  "action" "UploadAuditAction" NOT NULL,
  "objectKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UploadAuditLog_userId_createdAt_idx" ON "UploadAuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UploadAuditLog_productId_createdAt_idx" ON "UploadAuditLog"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "UploadAuditLog_action_createdAt_idx" ON "UploadAuditLog"("action", "createdAt");

ALTER TABLE "UploadAuditLog"
  ADD CONSTRAINT "UploadAuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadAuditLog"
  ADD CONSTRAINT "UploadAuditLog_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
