DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FailedJobStatus') THEN
    CREATE TYPE "FailedJobStatus" AS ENUM ('PENDING', 'RETRYING', 'RESOLVED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FailedUploadJob" (
  "id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "error" TEXT NOT NULL,
  "status" "FailedJobStatus" NOT NULL DEFAULT 'PENDING',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastTriedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FailedUploadJob_pkey" PRIMARY KEY ("id")
);
