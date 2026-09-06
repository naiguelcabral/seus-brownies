-- Custom SQL migration file, put your code below! --
-- Run only after 0015 commits the new enum values. This transition preserves
-- the existing HML owner link and records the role change without inventing a
-- human actor for a migration-run operation.
WITH migrated_access AS (
  UPDATE "public"."app_user_access"
  SET
    "role" = 'owner'::"public"."app_access_role",
    "role_updated_at" = now(),
    "updated_at" = now()
  WHERE "role" = 'admin'::"public"."app_access_role"
  RETURNING "auth_user_id"
)
INSERT INTO "public"."auth_audit_events" (
  "actor_auth_user_id",
  "action",
  "outcome",
  "target_type",
  "target_id",
  "request_id",
  "metadata"
)
SELECT
  NULL,
  'role_changed',
  'success'::"public"."auth_audit_outcome",
  'access',
  "auth_user_id",
  'migration:0016:migrate-admin-to-owner',
  jsonb_build_object(
    'reasonCode', 'role_model_transition',
    'fromRole', 'admin',
    'toRole', 'owner'
  )
FROM migrated_access;
