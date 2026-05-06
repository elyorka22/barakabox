DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UploadAuditAction' AND e.enumlabel = 'RETRY'
  ) THEN
    ALTER TYPE "UploadAuditAction" ADD VALUE 'RETRY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'FailedJobStatus' AND e.enumlabel = 'FAILED'
  ) THEN
    ALTER TYPE "FailedJobStatus" ADD VALUE 'FAILED';
  END IF;
END $$;
