-- LAB-ONLY. PostgreSQL 17 disposable fixture only. Never run this file on Neon.
-- Preconditions: database neondb; schemas public and drizzle already exist; fixture_admin
-- owns the lab objects. Password delivery is deliberately outside this script.
-- The disposable test substitutes @@VALID_UNTIL_UTC@@ immediately before execution.
-- An authorized lab runner must generate a short UTC value out of band; this template
-- never supplies or stores a credential.
CREATE ROLE fixture_audit LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS VALID UNTIL '@@VALID_UNTIL_UTC@@';

ALTER ROLE fixture_audit SET default_transaction_read_only = on;
REVOKE ALL PRIVILEGES ON DATABASE neondb FROM fixture_audit;
REVOKE TEMPORARY ON DATABASE neondb FROM PUBLIC;
GRANT CONNECT ON DATABASE neondb TO fixture_audit;
REVOKE ALL PRIVILEGES ON SCHEMA public, drizzle FROM fixture_audit;
GRANT USAGE ON SCHEMA public, drizzle TO fixture_audit;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, drizzle FROM fixture_audit;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public, drizzle FROM fixture_audit;
GRANT SELECT ON ALL TABLES IN SCHEMA public, drizzle TO fixture_audit;
ALTER DEFAULT PRIVILEGES FOR ROLE fixture_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM fixture_audit;
ALTER DEFAULT PRIVILEGES FOR ROLE fixture_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM fixture_audit;
ALTER DEFAULT PRIVILEGES FOR ROLE fixture_admin IN SCHEMA drizzle
  REVOKE ALL ON TABLES FROM fixture_audit;
ALTER DEFAULT PRIVILEGES FOR ROLE fixture_admin IN SCHEMA drizzle
  REVOKE ALL ON SEQUENCES FROM fixture_audit;
