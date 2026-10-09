// Independent PostgreSQL catalog collector. No connection string or driver setup.
// It reads only public metadata and includes manually authored functions/triggers.
const queries = {
  tables: `SELECT c.relname name, c.relkind kind, c.relpersistence persistence,
    c.relrowsecurity rls_enabled, c.relforcerowsecurity rls_forced, c.relreplident replica_identity
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') ORDER BY c.relname`,
  columns: `SELECT c.relname table_name, a.attname name, a.attnum position,
    format_type(a.atttypid,a.atttypmod) type, a.attnotnull not_null,
    pg_get_expr(d.adbin,d.adrelid,false) default_expression, a.attidentity identity, a.attgenerated generated
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY c.relname,a.attnum`,
  constraints: `SELECT c.relname table_name, x.conname name, x.contype type,
    x.convalidated validated, x.condeferrable deferrable, x.condeferred deferred,
    x.connoinherit no_inherit, pg_get_constraintdef(x.oid,false) definition
    FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,x.conname`,
  indexes: `SELECT c.relname table_name, i.relname name, x.indisunique is_unique,
    x.indisprimary is_primary, x.indisvalid valid, x.indisready ready,
    pg_get_indexdef(x.indexrelid,0,false) definition, pg_get_expr(x.indpred,x.indrelid,false) predicate
    FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,i.relname`,
  enums: `SELECT t.typname name, array_agg(e.enumlabel ORDER BY e.enumsortorder) values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`,
  functions: `SELECT p.proname name, pg_get_function_identity_arguments(p.oid) arguments,
    pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname,arguments`,
  triggers: `SELECT c.relname table_name, t.tgname name, t.tgenabled enabled,
    pg_get_triggerdef(t.oid,false) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal
    ORDER BY c.relname,t.tgname`,
  sequences: `SELECT c.relname name, format_type(s.seqtypid,NULL) type,
    s.seqstart::text start, s.seqincrement::text increment, s.seqmin::text minimum,
    s.seqmax::text maximum, s.seqcache::text cache, s.seqcycle cycle
    FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname`,
  policies: `SELECT c.relname table_name, p.polname name, p.polpermissive permissive,
    ARRAY(SELECT CASE WHEN role_oid=0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid)::text END
      FROM unnest(p.polroles) role_oid ORDER BY 1) roles,
    p.polcmd command, pg_get_expr(p.polqual,p.polrelid,false) using_expression,
    pg_get_expr(p.polwithcheck,p.polrelid,false) check_expression
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,p.polname`,
}

export async function captureCatalog(client) {
  await client.query('BEGIN READ ONLY')
  try {
    await client.query('SET LOCAL search_path TO public')
    const mode = (
      await client.query("SELECT current_setting('transaction_read_only') mode")
    ).rows[0].mode
    if (mode !== 'on') throw new Error('catalog collection is not read-only')
    const catalog = {}
    for (const [name, sql] of Object.entries(queries))
      catalog[name] = (await client.query(sql)).rows
    await client.query('COMMIT')
    return catalog
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
