-- REVIEW ONLY. Not a migration and not approved for external execution yet.
-- Target: steep-brook-51659857 / br-lingering-wind-acwh5wap / neondb.
-- When using run_sql_transaction, omit BEGIN/ROLLBACK because the tool wraps
-- the statements; SET TRANSACTION READ ONLY must remain the first statement.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

-- Does not read business rows, identities, sessions, credentials or audit data.
SELECT
  current_database() AS database_name,
  current_setting('transaction_read_only') AS transaction_read_only,
  current_setting('search_path') AS search_path,
  pg_catalog.to_regclass('public.auth_audit_events') IS NOT NULL AS public_auth_audit_events,
  pg_catalog.to_regclass('auth_audit_events') IS NOT NULL AS visible_auth_audit_events,
  pg_catalog.to_regclass('public.auth_login_attempts') IS NOT NULL AS public_auth_login_attempts,
  pg_catalog.to_regclass('public.app_user_access') IS NOT NULL AS public_app_user_access,
  pg_catalog.to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS migration_journal_present;

-- Only the three application-owned auth table names. Provider tables excluded.
SELECT n.nspname AS schema_name, c.relname AS relation_name, c.relkind AS relation_kind
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relname IN ('auth_audit_events', 'auth_login_attempts', 'app_user_access')
ORDER BY n.nspname, c.relname
LIMIT 20;

-- Column types/nullability only; no defaults or object definitions with values.
SELECT n.nspname AS schema_name, c.relname AS relation_name,
  a.attname AS column_name, pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
  a.attnotnull AS required
FROM pg_catalog.pg_attribute AS a
JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relname IN ('auth_audit_events', 'auth_login_attempts', 'app_user_access')
  AND c.relkind IN ('r', 'p')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum
LIMIT 80;

ROLLBACK;
