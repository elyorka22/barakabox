-- Promote legacy admin seed user to SUPER_ADMIN (idempotent).
-- Runs after 20260515120000_staff_rbac_user_fields so enum value SUPER_ADMIN is committed.
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE email = 'admin@barakabox.local'
  AND role = 'ADMIN';
