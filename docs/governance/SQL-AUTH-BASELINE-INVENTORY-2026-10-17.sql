-- REVIEW ONLY: not approved/executed externally. Catalog only, no application rows.
-- Target: steep-brook-51659857 / br-lingering-wind-acwh5wap / neondb.
-- Proposed extension of the previous narrow auth catalog authorization.
-- run_sql_transaction wraps the transaction: omit BEGIN/ROLLBACK there and
-- keep SET TRANSACTION READ ONLY as the first statement.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

SELECT current_database() AS database_name,
  current_setting('transaction_read_only') AS transaction_read_only;

-- Existing application and migration relations; Neon Auth provider data excluded.
SELECT n.nspname AS schema_name, c.relname AS relation_name, c.relkind AS relation_kind
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'drizzle') AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
ORDER BY n.nspname, c.relname
LIMIT 200;

-- Detect partially applied auth DDL before proposing the existing migrations.
SELECT n.nspname AS schema_name, t.typname AS type_name, e.enumlabel AS label
FROM pg_catalog.pg_type AS t
JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace
LEFT JOIN pg_catalog.pg_enum AS e ON e.enumtypid = t.oid
WHERE n.nspname = 'public' AND t.typname IN ('app_access_role', 'auth_audit_outcome')
ORDER BY t.typname, e.enumsortorder
LIMIT 30;

ROLLBACK;
