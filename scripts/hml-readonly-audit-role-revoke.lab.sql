-- LAB-ONLY. PostgreSQL 17 disposable fixture only. Never run this file on Neon.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, drizzle FROM fixture_audit;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public, drizzle FROM fixture_audit;
REVOKE ALL PRIVILEGES ON SCHEMA public, drizzle FROM fixture_audit;
REVOKE ALL PRIVILEGES ON DATABASE neondb FROM fixture_audit;
DROP OWNED BY fixture_audit;
DROP ROLE fixture_audit;
