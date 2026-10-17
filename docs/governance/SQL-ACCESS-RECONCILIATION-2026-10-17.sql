-- Prepared for review only. Not a migration or an automatic executor.
-- Requires a separate human approval for these two grants in the original DB.
-- Run inside ONE transaction after set_config('cacau.access_reconciliation',
-- JSON, true). Parameters: databaseName, ownerUserId, managerUserId, requestId.
-- Revalidate both verified identities and active source roles in g1-auth-hml
-- immediately before execution. Never alter the managed identity schema.
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '2s';
LOCK TABLE public.app_user_access, public.auth_audit_events IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE
  parameters jsonb := current_setting('cacau.access_reconciliation', true)::jsonb;
  owner_id uuid;
  manager_id uuid;
  operation_reference text;
  affected integer;
BEGIN
  IF parameters IS NULL OR parameters->>'databaseName' IS DISTINCT FROM current_database()
    OR current_setting('transaction_read_only') <> 'off' THEN
    RAISE EXCEPTION 'ACCESS_RECONCILIATION_TARGET_MISMATCH';
  END IF;
  owner_id := (parameters->>'ownerUserId')::uuid;
  manager_id := (parameters->>'managerUserId')::uuid;
  operation_reference := parameters->>'requestId';
  IF owner_id IS NULL OR manager_id IS NULL OR owner_id = manager_id
    OR operation_reference IS NULL OR operation_reference !~ '^access-reconciliation:20261017:[0-9a-f-]{36}$' THEN
    RAISE EXCEPTION 'ACCESS_RECONCILIATION_INVALID_PARAMETERS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.auth_audit_events a WHERE a.request_id = operation_reference) THEN
    RAISE EXCEPTION 'ACCESS_RECONCILIATION_REFERENCE_CONSUMED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_user_access) THEN
    RAISE EXCEPTION 'ACCESS_RECONCILIATION_REQUIRES_EMPTY_ALLOWLIST';
  END IF;
  INSERT INTO public.app_user_access(auth_user_id, role, is_active)
  VALUES (owner_id::text, 'owner', true), (manager_id::text, 'manager', true);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'ACCESS_RECONCILIATION_LINK_COUNT_MISMATCH';
  END IF;
  INSERT INTO public.auth_audit_events
    (actor_auth_user_id, action, outcome, target_type, target_id, request_id, metadata)
  SELECT NULL, 'role_changed', 'success', 'access', a.auth_user_id, operation_reference,
    jsonb_build_object(
      'reasonCode', 'operator_approved_access_reconciliation',
      'fromRole', NULL, 'toRole', a.role::text,
      'sourceBranch', 'br-patient-lake-ac2t0cvq',
      'humanApprover', 'project_operator_via_conversation',
      'executionChannel', 'neon_mcp_administrative'
    )
  FROM public.app_user_access a
  WHERE a.auth_user_id IN (owner_id::text, manager_id::text);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'ACCESS_RECONCILIATION_AUDIT_COUNT_MISMATCH';
  END IF;
END $$;
