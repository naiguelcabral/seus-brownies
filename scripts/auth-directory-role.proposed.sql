-- REVIEW ONLY. Target: provider identity branch g1-auth-hml, not the operational database.
-- No password, login activation or Worker binding is created by this proposal.
-- Apply only after independent target verification and specific approval.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'neondb'
     OR to_regclass('neon_auth."user"') IS NULL
     OR to_regclass('neon_auth.verification') IS NULL THEN
    RAISE EXCEPTION 'AUTH_DIRECTORY_TARGET_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cacau_auth_directory') THEN
    RAISE EXCEPTION 'AUTH_DIRECTORY_ROLE_ALREADY_EXISTS_REVIEW_REQUIRED';
  END IF;
END $$;
CREATE ROLE cacau_auth_directory NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
ALTER ROLE cacau_auth_directory SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE neondb TO cacau_auth_directory;
GRANT USAGE ON SCHEMA neon_auth TO cacau_auth_directory;
GRANT SELECT (id, name, email, "emailVerified", banned, "updatedAt")
  ON neon_auth."user" TO cacau_auth_directory;

CREATE SCHEMA cacau_security;
REVOKE ALL ON SCHEMA cacau_security FROM PUBLIC;
CREATE FUNCTION cacau_security.password_reset_subject(p_token text)
RETURNS TABLE(auth_user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT u.id
  FROM neon_auth.verification AS v
  JOIN neon_auth."user" AS u ON u.id::text = v.value
  WHERE length(p_token) BETWEEN 1 AND 2048
    AND v.identifier = 'reset-password:' || p_token
    AND v."expiresAt" > statement_timestamp()
  LIMIT 2
$$;
REVOKE ALL ON FUNCTION cacau_security.password_reset_subject(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA cacau_security TO cacau_auth_directory;
GRANT EXECUTE ON FUNCTION cacau_security.password_reset_subject(text) TO cacau_auth_directory;
COMMIT;
