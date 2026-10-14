-- Independent catalog. Private in memory; only digest is emitted.
WITH ns AS (SELECT * FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'),
c AS (SELECT c.*, n.nspname FROM pg_class c JOIN ns n ON n.oid=c.relnamespace)
SELECT jsonb_build_object(
 'schemas', (SELECT coalesce(jsonb_agg(nspname ORDER BY nspname),'[]') FROM ns),
 'relations', (SELECT coalesce(jsonb_agg(jsonb_build_array(nspname,relname,relkind,relpersistence,relrowsecurity,relforcerowsecurity) ORDER BY nspname,relname),'[]') FROM c),
 'columns', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated) ORDER BY c.nspname,c.relname,a.attnum),'[]') FROM c JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE a.attnum>0 AND NOT a.attisdropped),
 'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid,true)) ORDER BY c.nspname,c.relname,k.conname),'[]') FROM c JOIN pg_constraint k ON k.conrelid=c.oid),
 'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid)) ORDER BY c.nspname,c.relname),'[]') FROM c JOIN pg_index i ON i.indexrelid=c.oid),
 'types', (SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,t.typname,t.typtype,format_type(t.typbasetype,t.typtypmod),t.typnotnull,t.typdefault) ORDER BY n.nspname,t.typname),'[]') FROM pg_type t JOIN ns n ON n.oid=t.typnamespace),
 'domain_constraints', (SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,t.typname,k.conname,k.convalidated,pg_get_constraintdef(k.oid,true)) ORDER BY n.nspname,t.typname,k.conname),'[]') FROM pg_constraint k JOIN pg_type t ON t.oid=k.contypid JOIN ns n ON n.oid=t.typnamespace),
 'views', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,pg_get_viewdef(c.oid,true)) ORDER BY c.nspname,c.relname),'[]') FROM c WHERE c.relkind IN ('v','m')),
 'sequences', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle) ORDER BY c.nspname,c.relname),'[]') FROM c JOIN pg_sequence s ON s.seqrelid=c.oid),
 'rules', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,r.rulename,pg_get_ruledef(r.oid,true)) ORDER BY c.nspname,c.relname,r.rulename),'[]') FROM c JOIN pg_rewrite r ON r.ev_class=c.oid),
 'extensions', (SELECT coalesce(jsonb_agg(jsonb_build_array(e.extname,e.extversion,n.nspname) ORDER BY e.extname),'[]') FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
 'enums', (SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,t.typname,e.enumlabel,e.enumsortorder) ORDER BY n.nspname,t.typname,e.enumsortorder),'[]') FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN ns n ON n.oid=t.typnamespace),
 'functions', (SELECT coalesce(jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.provolatile,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid)) ORDER BY n.nspname,p.proname,p.oid::regprocedure::text),'[]') FROM pg_proc p JOIN ns n ON n.oid=p.pronamespace WHERE p.prokind IN ('f','p')),
 'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true)) ORDER BY c.nspname,c.relname,t.tgname),'[]') FROM c JOIN pg_trigger t ON t.tgrelid=c.oid WHERE NOT t.tgisinternal),
 'policies', (SELECT coalesce(jsonb_agg(jsonb_build_array(c.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY c.nspname,c.relname,p.polname),'[]') FROM c JOIN pg_policy p ON p.polrelid=c.oid)
) AS catalog;
