// Offline review compiler. No environment loading, connection or application mode.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const q = (value) =>
  value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const json = (value) => `${q(JSON.stringify(value))}::jsonb`
const productId = (sku) =>
  `(SELECT id FROM public.products WHERE sku=${q(sku)})`
const recipeId = `(SELECT id FROM public.recipe_versions WHERE source_id='RECIPE-BASE-001')`
const profileId = (sku) =>
  `(SELECT id FROM public.production_profiles WHERE source_id=${q(`RECIPE-BASE-001:${sku}`)})`

export function buildTechnicalCatalogPayload() {
  const candidateRaw = readFileSync(
    new URL('evidence/technical-catalog-candidate-2026-10-18.json', root),
    'utf8',
  )
  assert.equal(
    hash(candidateRaw),
    '4238c15a1f22c77439e8442b36182d85cb6ab9a6ba5a79852a60930b7b413b76',
    'Candidate changed; review required',
  )
  const candidate = JSON.parse(candidateRaw)
  const manifestRaw = readFileSync(
    new URL('data/receita-base-vinculos.json', root),
    'utf8',
  )
  assert.equal(
    hash(manifestRaw),
    candidate.sourceManifestSha256,
    'Manifest changed',
  )
  const manifest = JSON.parse(manifestRaw)
  const sourceRaw = readFileSync(
    new URL(
      'evidence/technical-catalog-source-revalidated-2026-10-18.json',
      root,
    ),
    'utf8',
  )
  assert.equal(
    hash(sourceRaw),
    '386bfd75b3606d7aa2d367ab848fff6567142c6cb3c819a17f8bdef5294386e1',
    'Revalidated source changed',
  )
  const source = JSON.parse(sourceRaw)
  const preflightRaw = readFileSync(
    new URL(candidate.catalogPreflight, root),
    'utf8',
  )
  assert.equal(
    hash(preflightRaw),
    'a0e6b955dbacbb3ccf16122a40aa626495743ffa9dfc1d9813b7e96fec432431',
  )
  const { catalog } = JSON.parse(preflightRaw)
  assert.equal(
    source.workbookSha256,
    '25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64',
  )
  assert.equal(source.manifestSha256, hash(manifestRaw))
  assert.equal(source.excludedHistoricalPlans, 17)
  assert.deepEqual(candidate.recipe, manifest.recipe)
  assert.deepEqual(
    candidate.profileAdditionalComponents,
    manifest.profileAdditionalComponents,
  )
  assert.deepEqual(
    source.recipe.items.map(({ source: _source, ...item }) => item),
    manifest.recipe.physicalItems,
  )
  assert.deepEqual(
    source.recipe.operational.map(({ source: _source, ...item }) => item),
    manifest.recipe.operationalRequirements,
  )
  assert.deepEqual(
    source.rates.map(
      ({ source: _source, sourceHash: _hash, sourceKey: _key, ...item }) =>
        item,
    ),
    manifest.recipe.operationalRates,
  )
  assert.equal(source.profiles.length, 17)
  for (const profile of candidate.profiles) {
    const original = source.profiles.find(
      (p) => p.productSku === profile.productSku,
    )
    assert.ok(original)
    for (const field of [
      'cutSize',
      'filling',
      'expectedYield',
      'packagingSku',
      'packagingQuantity',
    ])
      assert.equal(profile[field], original[field])
    const rule = manifest.individualPackagingRules.find((r) =>
      r.productSourceIds.includes(profile.productSku),
    )
    assert.equal(profile.packagingSku, rule?.packagingSku ?? null)
    assert.equal(profile.packagingQuantity, rule?.quantity ?? null)
    assert.equal(
      profile.productName,
      catalog.find((p) => p.sku === profile.productSku)?.name,
    )
  }
  const rolloutRaw = readFileSync(
    new URL('evidence/exact-costs-rollout-plan-2026-10-18.json', root),
    'utf8',
  )
  assert.equal(
    hash(rolloutRaw),
    'cb8b61fb04c0b01733a7aec4909bc166756c7f2c59b17970e7c1e8853705bb81',
    'Schema baseline changed',
  )
  const rollout = JSON.parse(rolloutRaw)
  const historyGuard = rollout.statements.find((s) =>
    s.includes('EXACT_COST_HISTORY_MISMATCH'),
  )
  const receipts = [
    ...historyGuard.matchAll(/\('([a-f0-9]{64})',(\d+)::bigint\)/g),
  ].map((m) => [m[1], m[2]])
  assert.equal(receipts.length, 31)
  receipts.push(...rollout.migrations.map((r) => [r.sha256, r.when]))
  const reference = candidate.proposedReference
  const sourceHash = hash(JSON.stringify({ candidate, source }))
  const additions = {
    products: 1,
    recipe_versions: 1,
    recipe_items: 7,
    recipe_operational_requirements: 2,
    operational_cost_rates: 2,
    production_profiles: 17,
    production_profile_components: 12,
    historical_import_records: 1,
    operational_audit_events: 43,
  }
  const technical = [
    'recipe_versions',
    'recipe_items',
    'recipe_operational_requirements',
    'operational_cost_rates',
    'production_profiles',
    'production_profile_components',
  ]
  const operational = [
    'stock_movements',
    'purchases',
    'purchase_items',
    'production_batches',
    'production_batch_outputs',
    'production_batch_consumptions',
    'operational_costs',
    'sales',
    'sale_items',
    'inventory_cost_layers',
    'inventory_cost_allocations',
    'inventory_cost_reversals',
    'production_batch_losses',
  ]
  const statements = [
    'BEGIN',
    "SET LOCAL lock_timeout = '5s'",
    "SET LOCAL statement_timeout = '30s'",
    'SET LOCAL standard_conforming_strings = on',
    'SET LOCAL search_path TO pg_catalog, public',
    'SELECT pg_catalog.pg_advisory_xact_lock(169231029)',
    `DO $$ BEGIN IF current_database() <> 'neondb' THEN RAISE EXCEPTION 'TECH_TARGET_MISMATCH'; END IF; END $$`,
    // Lock and snapshot every existing public table, including journal preservation separately.
    `DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE', t.tablename); END LOOP; END $$`,
    'LOCK TABLE drizzle.__drizzle_migrations IN SHARE ROW EXCLUSIVE MODE',
    'CREATE TEMP TABLE tech_before(table_name text, row_data jsonb) ON COMMIT DROP',
    'CREATE TEMP TABLE tech_counts(table_name text, records bigint) ON COMMIT DROP',
    `DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
      EXECUTE format('INSERT INTO pg_temp.tech_before SELECT %L,to_jsonb(t) FROM public.%I t', t.tablename,t.tablename);
      EXECUTE format('INSERT INTO pg_temp.tech_counts SELECT %L,count(*) FROM public.%I',t.tablename,t.tablename);
    END LOOP; END $$`,
    'CREATE TEMP TABLE tech_journal_before ON COMMIT DROP AS SELECT * FROM drizzle.__drizzle_migrations',
    `DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM public.historical_import_records WHERE source_key=${q(reference)} OR source_hash=${q(sourceHash)}) OR EXISTS(SELECT 1 FROM public.operational_audit_events WHERE operation_reference=${q(reference)}) THEN RAISE EXCEPTION 'TECH_REFERENCE_OR_HASH_CONSUMED'; END IF;
      IF (SELECT count(*) FROM public.products) <> 36 OR (SELECT count(*) FROM jsonb_to_recordset(${json(catalog)}) e(sku text,name text,product_type text,unit text,is_active boolean) JOIN public.products p ON p.sku=e.sku WHERE p.name=e.name AND p.product_type::text=e.product_type AND p.measurement_unit::text=e.unit AND p.is_active=e.is_active) <> 36 THEN RAISE EXCEPTION 'TECH_CATALOG_CHANGED'; END IF;
      ${[...technical, ...operational].map((table) => `IF EXISTS(SELECT 1 FROM public.${table}) THEN RAISE EXCEPTION 'TECH_NONEMPTY_${table}'; END IF;`).join('\n')}
      IF NOT EXISTS(SELECT 1 FROM public.categories WHERE name='Insumos do workbook' AND is_active) THEN RAISE EXCEPTION 'TECH_CATEGORY_UNAVAILABLE'; END IF;
      IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 33 OR EXISTS(SELECT 1 FROM (VALUES ${receipts.map(([h, t]) => `(${q(h)},${t}::bigint)`).join(',')}) e(hash,created_at) FULL JOIN drizzle.__drizzle_migrations a USING(created_at) WHERE e.hash IS DISTINCT FROM a.hash) THEN RAISE EXCEPTION 'TECH_SCHEMA_RECEIPTS_CHANGED'; END IF;
      IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND (table_name,column_name) IN (('inventory_cost_allocations','exact_cost'),('inventory_cost_layers','exact_original_cost'),('inventory_cost_layers','exact_remaining_cost'),('inventory_cost_reversals','exact_cost'),('production_batch_consumptions','exact_cost'),('production_batch_outputs','exact_cost'),('production_batches','exact_cost'),('stock_movements','exact_cost'),('operational_costs','exact_cost')) AND data_type='jsonb') < 9 THEN RAISE EXCEPTION 'TECH_EXACT_SCHEMA_REQUIRED'; END IF;
    END $$`,
  ]
  const expectedRows = []
  const finalReadbacks = []
  function insert(table, columns, expressions) {
    statements.push(`WITH added AS (INSERT INTO public.${table}(${columns.join(',')}) VALUES(${expressions.join(',')}) RETURNING id)
      INSERT INTO public.operational_audit_events(action,entity_type,entity_id,operation_reference,reason)
      SELECT 'technical.catalog.create',${q(table)},id::text,${q(reference)},'Cadastro tecnico delimitado; aplicacao exige aprovacao humana especifica. Executor SQL/Codex; ator Auth nao atribuido. Sem estoque ou fatos operacionais.' FROM added`)
    const readback = `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.${table} WHERE ${columns.map((col, i) => `${col} IS NOT DISTINCT FROM ${expressions[i]}`).join(' AND ')}) THEN RAISE EXCEPTION 'TECH_INSERT_READBACK_${table}'; END IF; END $$`
    statements.push(readback)
    finalReadbacks.push(readback)
    expectedRows.push(table)
  }
  insert(
    'products',
    [
      'sku',
      'name',
      'product_type',
      'measurement_unit',
      'is_active',
      'sale_price',
      'category_id',
      'description',
    ],
    [
      q('HIS-OVOS-GRANDES'),
      q('Ovos Grandes'),
      q('ingredient'),
      q('unit'),
      'true',
      'NULL',
      "(SELECT id FROM public.categories WHERE name='Insumos do workbook')",
      q(
        'Vinculo fisico da receita-base; sem custo, preco de venda ou saldo inicial.',
      ),
    ],
  )
  insert(
    'recipe_versions',
    ['source_id', 'source_hash', 'name', 'version', 'status', 'source_payload'],
    [
      q(source.recipe.externalId),
      q(source.recipe.sourceHash),
      q(source.recipe.name),
      '1',
      q('active'),
      json(source.recipe.source),
    ],
  )
  for (const item of source.recipe.items)
    insert(
      'recipe_items',
      [
        'source_key',
        'source_hash',
        'recipe_version_id',
        'product_id',
        'source_name',
        'quantity',
        'unit',
        'source_payload',
      ],
      [
        q(`workbook:recipe-item:RECIPE-BASE-001:${item.sourceName}`),
        q(hash(JSON.stringify(item))),
        recipeId,
        productId(item.productSku),
        q(item.sourceName),
        q(item.quantity),
        q(item.unit),
        json(item),
      ],
    )
  for (const item of source.recipe.operational)
    insert(
      'recipe_operational_requirements',
      [
        'source_key',
        'source_hash',
        'recipe_version_id',
        'type',
        'quantity',
        'unit',
        'source_payload',
      ],
      [
        q(`workbook:recipe-operational:RECIPE-BASE-001:${item.type}`),
        q(hash(JSON.stringify(item))),
        recipeId,
        q(item.type),
        q(item.quantity),
        q(item.unit),
        json(item),
      ],
    )
  for (const rate of source.rates)
    insert(
      'operational_cost_rates',
      [
        'source_id',
        'source_hash',
        'type',
        'unit',
        'unit_amount',
        'effective_from',
        'source_payload',
      ],
      [
        q(rate.sourceId),
        q(rate.sourceHash),
        q(rate.type),
        q(rate.unit),
        q(rate.unitAmount),
        q(rate.effectiveFrom),
        json(rate.source),
      ],
    )
  for (const profile of candidate.profiles) {
    const original = source.profiles.find(
      (p) => p.productSku === profile.productSku,
    )
    insert(
      'production_profiles',
      [
        'source_id',
        'source_hash',
        'recipe_version_id',
        'product_id',
        'cut_size',
        'filling',
        'expected_yield',
        'packaging_product_id',
        'packaging_quantity',
        'source_payload',
      ],
      [
        q(original.sourceId),
        q(original.sourceHash),
        recipeId,
        productId(profile.productSku),
        q(profile.cutSize),
        q(profile.filling),
        q(profile.expectedYield),
        profile.packagingSku ? productId(profile.packagingSku) : 'NULL',
        q(profile.packagingQuantity),
        json({
          ...original.source,
          operationallyComplete: profile.operationallyComplete,
          limitation: profile.operationallyComplete
            ? null
            : 'Embalagem/cobertura pendentes; perfil de referencia sem homologacao operacional.',
        }),
      ],
    )
  }
  for (const component of candidate.profileAdditionalComponents)
    insert(
      'production_profile_components',
      [
        'source_id',
        'source_hash',
        'production_profile_id',
        'product_id',
        'role',
        'quantity',
        'unit',
        'quantity_basis',
        'source_payload',
      ],
      [
        q(component.sourceId),
        q(hash(JSON.stringify(component))),
        profileId(component.productSku),
        productId(component.fillingProductSku),
        q(component.role),
        q(component.quantity),
        q(component.unit),
        q(component.quantityBasis),
        json(component),
      ],
    )
  insert(
    'historical_import_records',
    ['source_key', 'source_hash', 'entity_type', 'source_sheet', 'payload'],
    [
      q(reference),
      q(sourceHash),
      q('technical_catalog'),
      q('03_Cadastro_Insumos / 02_Cadastro_Produtos / operational_decision'),
      json({
        candidate,
        source,
        executor: 'SQL/Codex; actor Auth unassigned',
        requiresSpecificHumanApproval: true,
      }),
    ],
  )
  assert.equal(expectedRows.length, 43)
  statements.push(...finalReadbacks)
  statements.push(`DO $$ DECLARE t record; altered boolean; actual_count bigint; extra bigint; BEGIN
    FOR t IN SELECT * FROM pg_temp.tech_counts LOOP
      EXECUTE format('SELECT EXISTS(SELECT row_data FROM pg_temp.tech_before WHERE table_name=%L EXCEPT SELECT to_jsonb(p) FROM public.%I p)',t.table_name,t.table_name) INTO altered;
      IF altered THEN RAISE EXCEPTION 'TECH_EXISTING_ROWS_CHANGED: %',t.table_name; END IF;
      EXECUTE format('SELECT count(*) FROM public.%I',t.table_name) INTO actual_count;
      extra := COALESCE((${json(additions)}->>t.table_name)::bigint,0);
      IF actual_count <> t.records + extra THEN RAISE EXCEPTION 'TECH_COUNT_MISMATCH: %',t.table_name; END IF;
    END LOOP;
    IF EXISTS((SELECT * FROM pg_temp.tech_journal_before EXCEPT SELECT * FROM drizzle.__drizzle_migrations) UNION ALL (SELECT * FROM drizzle.__drizzle_migrations EXCEPT SELECT * FROM pg_temp.tech_journal_before)) THEN RAISE EXCEPTION 'TECH_JOURNAL_CHANGED'; END IF;
    IF (SELECT count(*) FROM public.operational_audit_events WHERE operation_reference=${q(reference)} AND action='technical.catalog.create' AND actor_auth_user_id IS NULL) <> 43 THEN RAISE EXCEPTION 'TECH_AUDIT_MISMATCH'; END IF;
    IF EXISTS(SELECT 1 FROM public.recipe_items WHERE historical_cost IS NOT NULL) OR EXISTS(SELECT 1 FROM public.recipe_operational_requirements WHERE historical_cost IS NOT NULL) THEN RAISE EXCEPTION 'TECH_HISTORICAL_COST_PROJECTION'; END IF;
  END $$`)
  statements.push(
    `SELECT ${q(reference)} AS consumed_reference, 37 AS products, 17 AS profiles, 12 AS filling_components, 43 AS audit_events`,
    'COMMIT',
  )
  const sql =
    '-- REVIEW PACKAGE ONLY. Requires target revalidation, backup/rehearsal and explicit human approval.\n' +
    statements.join(';\n\n') +
    ';\n'
  return {
    sql,
    manifest: {
      status: 'READY_FOR_REVIEW_NOT_APPLIED',
      reference,
      sourceHash,
      sqlSha256: hash(sql),
      workbookSha256: source.workbookSha256,
      manifestSha256: source.manifestSha256,
      additions,
      excludedHistoricalPlans: 17,
      incompleteProfiles: ['PROD001', 'PROD017'],
      externalWrites: false,
    },
  }
}
