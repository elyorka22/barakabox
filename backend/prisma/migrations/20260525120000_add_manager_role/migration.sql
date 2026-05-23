-- Add MANAGER to Role enum (idempotent for environments that already have the value)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'MANAGER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'MANAGER';
  END IF;
END $$;
