-- Metadata only. Run inside an explicitly READ ONLY transaction.
-- Counts are a conservative ACL diagnostic, not an authorization or universal security proof.
WITH RECURSIVE reachable_roles(oid) AS (
  SELECT oid FROM pg_roles WHERE rolname IN (current_user, session_user)
  UNION
  SELECT m.roleid FROM pg_auth_members m JOIN reachable_roles r ON r.oid=m.member
  WHERE m.set_option
), roles AS (
  SELECT p.* FROM pg_roles p JOIN reachable_roles r ON r.oid=p.oid
), relations AS (
  SELECT c.* FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
    AND c.relpersistence <> 't' AND c.relkind IN ('r','p','v','m','f')
)
SELECT current_database() database, current_user role, session_user session_role,
  current_setting('transaction_read_only') transaction_read_only,
  current_setting('default_transaction_read_only') default_read_only,
  current_setting('server_version_num') server_version_num,
  ARRAY(SELECT rolname::text FROM roles ORDER BY rolname) reachable_roles,
  (SELECT count(*)::int FROM roles WHERE rolsuper OR rolcreaterole OR rolcreatedb
    OR rolreplication OR rolbypassrls) privileged_roles,
  EXISTS(SELECT 1 FROM roles r WHERE has_database_privilege(r.oid,current_database(),'CREATE')) database_create,
  EXISTS(SELECT 1 FROM roles r WHERE has_database_privilege(r.oid,current_database(),'TEMP')) database_temp,
  (SELECT count(*)::int FROM pg_namespace n CROSS JOIN roles r
    WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
      AND has_schema_privilege(r.oid,n.oid,'CREATE')) schema_create,
  (SELECT count(*)::int FROM relations c CROSS JOIN roles r
    WHERE has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) persistent_write,
  (SELECT count(*)::int FROM relations c JOIN pg_attribute a ON a.attrelid=c.oid
    CROSS JOIN roles r WHERE a.attnum>0 AND NOT a.attisdropped
      AND has_column_privilege(r.oid,c.oid,a.attnum,'INSERT,UPDATE,REFERENCES')) column_write,
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN roles r WHERE c.relkind='S' AND n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema' AND has_sequence_privilege(r.oid,c.oid,'USAGE,UPDATE')) sequence_write,
  (SELECT count(*)::int FROM relations c JOIN roles r ON r.oid=c.relowner) owned_relations,
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN roles r WHERE p.prosecdef AND n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema' AND has_function_privilege(r.oid,p.oid,'EXECUTE')) executable_definers;
