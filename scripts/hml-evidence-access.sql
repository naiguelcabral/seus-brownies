-- PostgreSQL 17; metadata only, inside BEGIN READ ONLY.
WITH me AS (SELECT * FROM pg_roles WHERE rolname=current_user),
rels AS (SELECT c.* FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'),
ns AS (SELECT * FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema')
SELECT current_database() AS database, current_user AS role, session_user AS session_role,
 inet_server_addr()::text AS server_address, inet_server_port() AS server_port,
 current_setting('server_version_num')::int AS server_version_num,
 current_setting('transaction_read_only') AS transaction_read_only,
 current_setting('default_transaction_read_only') AS default_read_only,
 (SELECT count(*)::int FROM me WHERE rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls) AS privileged,
 (SELECT count(*)::int FROM pg_auth_members WHERE member=(SELECT oid FROM me)) AS memberships,
 has_database_privilege(current_database(),'CREATE') AS database_create,
 has_database_privilege(current_database(),'TEMP') AS database_temp,
 pg_my_temp_schema()<>0 AS temporary_schema,
 (SELECT count(*)::int FROM pg_tablespace WHERE has_tablespace_privilege(oid,'CREATE')) AS tablespace_create,
 (SELECT count(*)::int FROM pg_parameter_acl p CROSS JOIN LATERAL aclexplode(p.paracl) a
   WHERE a.grantee IN (0,(SELECT oid FROM me))) AS parameter_write,
 (SELECT count(*)::int FROM (
   SELECT relacl AS acl FROM pg_class UNION ALL SELECT attacl FROM pg_attribute
   UNION ALL SELECT datacl FROM pg_database UNION ALL SELECT nspacl FROM pg_namespace
   UNION ALL SELECT proacl FROM pg_proc UNION ALL SELECT typacl FROM pg_type
   UNION ALL SELECT spcacl FROM pg_tablespace UNION ALL SELECT srvacl FROM pg_foreign_server
   UNION ALL SELECT fdwacl FROM pg_foreign_data_wrapper UNION ALL SELECT lomacl FROM pg_largeobject_metadata
 ) x CROSS JOIN LATERAL aclexplode(x.acl) a
 WHERE a.is_grantable AND a.grantee IN (0,(SELECT oid FROM me))) AS grant_options,
 (SELECT count(*)::int FROM ns WHERE has_schema_privilege(oid,'CREATE')) AS schema_create,
 (SELECT count(*)::int FROM rels WHERE CASE WHEN relkind IN ('r','p','v','m','f') THEN
   has_table_privilege(oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') ELSE false END) AS table_write,
 (SELECT count(*)::int FROM rels c JOIN pg_attribute a ON a.attrelid=c.oid
   WHERE CASE WHEN c.relkind IN ('r','p','v','m','f') AND a.attnum>0 AND NOT a.attisdropped
   THEN has_column_privilege(c.oid,a.attnum,'INSERT,UPDATE,REFERENCES') ELSE false END) AS column_write,
 (SELECT count(*)::int FROM rels WHERE CASE WHEN relkind='S' THEN has_sequence_privilege(oid,'USAGE,UPDATE') ELSE false END) AS sequence_write,
 ((SELECT count(*) FROM pg_database WHERE datdba=(SELECT oid FROM me)) +
  (SELECT count(*) FROM ns WHERE nspowner=(SELECT oid FROM me)) +
  (SELECT count(*) FROM rels WHERE relowner=(SELECT oid FROM me)) +
  (SELECT count(*) FROM pg_proc WHERE proowner=(SELECT oid FROM me)) +
  (SELECT count(*) FROM pg_type WHERE typowner=(SELECT oid FROM me)))::int AS ownership,
 (SELECT count(*)::int FROM pg_proc p JOIN ns ON ns.oid=p.pronamespace
   WHERE has_function_privilege(p.oid,'EXECUTE')) AS executable_custom_functions,
 (SELECT count(*)::int FROM pg_foreign_server WHERE has_server_privilege(oid,'USAGE')) AS foreign_access,
 (SELECT count(DISTINCT l.oid)::int FROM pg_largeobject_metadata l
   LEFT JOIN LATERAL aclexplode(coalesce(l.lomacl,acldefault('L',l.lomowner))) a ON true
   WHERE l.lomowner=(SELECT oid FROM me) OR (a.grantee IN (0,(SELECT oid FROM me)) AND a.privilege_type='UPDATE')) AS largeobject_write;
