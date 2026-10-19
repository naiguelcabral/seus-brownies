// Offline compiler: no environment loading, network, database connection or application mode.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { requireDefined } from '../src/lib/required-value'
import {
  normalizeScenarioMix,
  calculateScenarioProjection,
} from '../src/features/scenarios/calculations'
import { scenarioDraftValues } from '../src/features/scenarios/contracts'
import { calculatePaymentTargets } from '../src/features/scenarios/payment-targets'

const reference = 'PROFILE-RECOVERY-FEES-2026-10-18-002'
const q = (value: unknown) =>
  value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const j = (value: unknown) => `${q(JSON.stringify(value))}::jsonb`
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const args = process.argv.slice(2)
assert.equal(args[0], '--backup')
assert.equal(args.length, 2)
assert.ok(args[1] && !args[1].includes('.env') && !args[1].includes('://'))
const backup = JSON.parse(readFileSync(args[1], 'utf8'))
const before = backup[1][0].backup
const receipts = backup[2]
assert.equal(receipts.length, 33)
assert.equal(before.production_profiles.length, 17)
assert.equal(before.production_profile_components.length, 12)
assert.equal(before.recipe_versions.length, 1)
assert.equal(before.management_scenarios.length, 1)
const products: Array<{
  id: number
  sku: string
  name: string
  product_type: string
  is_active: boolean
}> = before.products
const byId = new Map(products.map((row) => [row.id, row]))
const bySku = new Map(products.map((row) => [row.sku, row]))
const profiles = before.production_profiles.map(
  (row: { product_id: number; expected_yield: number }) => ({
    ...row,
    sku: requireDefined(byId.get(row.product_id)).sku,
  }),
)
const sourceCosts = new Map<string, { base: number; finishing: number }>()
const recipeCost = 16 / 3 + 3 + 14 / 9 + 18 + 1.2 + 7 / 60 + 0.4
const filling: Record<string, number> = {
  Brigadeiro: 45 / 1000,
  'Creme de Avelã': 30 / 1000,
  'Creme de avelã': 30 / 1000,
  'Doce de Leite': 80 / 2500,
  Goiabada: 17 / 1000,
  'Leite Ninho': 150 / 2600,
  Maracujá: 30 / 1000,
}
for (const row of profiles) {
  const sku = row.sku
  let finishing = 0
  if (sku === 'PROD002') finishing = 0.27
  else if (sku === 'PROD001') finishing = 2 + 0.11 + 0.16
  else if (sku === 'PROD017') finishing = 8 + 0.2 + 0.16
  else {
    const product = requireDefined(bySku.get(sku))
    const filled = product.name.includes('Recheado')
    const large = product.name.includes('7x7')
    finishing = (filled ? (large ? 0.2 : 0.15) : large ? 0.15 : 0.11) + 0.16
    if (filled) {
      const flavor = product.name.split('(')[1]?.replace(')', '')
      assert.ok(flavor && flavor in filling)
      finishing += requireDefined(filling[flavor]) * (large ? 40 : 20)
    }
  }
  sourceCosts.set(sku, {
    base:
      sku === 'PROD002'
        ? (recipeCost * 100) / 850
        : recipeCost / Number(row.expected_yield),
    finishing,
  })
}
const fees = {
  debitBps: 143,
  creditBps: 336,
  pixFixedCents: 49,
  effectiveOn: '2026-10-18',
}
const draft = scenarioDraftValues.parse({
  name: 'Meta conjunta R$ 10 mil — mix orientativo',
  effectiveOn: '2026-10-18',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2288.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.7000',
  feeTaxReserveRate: '0.0000',
  mix: before.management_scenario_mix
    .filter(
      (row: { product_id: number }) =>
        requireDefined(byId.get(row.product_id)).sku !== 'PROD002',
    )
    .map(
      (row: {
        product_id: number
        original_weight: number
        planned_unit_price: number
      }) => {
        const sku = requireDefined(byId.get(row.product_id)).sku
        const cost = requireDefined(sourceCosts.get(sku))
        return {
          productId: row.product_id,
          originalWeight: String(row.original_weight),
          plannedUnitPrice: Number(row.planned_unit_price).toFixed(2),
          plannedUnitCost: (cost.base + cost.finishing).toFixed(3),
        }
      },
    ),
})
const productStates = products.map((row) => ({
  id: row.id,
  name: row.name,
  type: row.product_type,
  isActive: row.is_active,
}))
const projection = calculateScenarioProjection(draft, productStates)
const skuQuantities = new Map(
  projection.productLines.map((line) => [
    requireDefined(byId.get(line.productId)).sku,
    Number(line.quantityPerMonth),
  ]),
)
const recipes = profiles
  .filter((row: { sku: string }) => row.sku !== 'PROD002')
  .reduce(
    (sum: number, row: { sku: string; expected_yield: number }) =>
      sum + (skuQuantities.get(row.sku) ?? 0) / Number(row.expected_yield),
    0,
  )
const normalizedMix = normalizeScenarioMix(draft.mix).rows
const description = `Meta conjunta R$ 10.000 de lucro: todas as vendas contam no resultado. Mix orientativo de brownies/bombons/kits, sem cotas obrigatórias por produto. Bordinhas vendidas contam como aproveitamento adicional, sem volume mínimo presumido. Fixos R$ 2.288 incluem MO R$ 600 (4 diárias de R$ 150), energia e MEI R$ 88. Receita 8 ovos/850 g frios. Custos físicos do workbook sem somar MO/energia novamente. Base antes das taxas; comparar débito 1,43%, crédito 3,36% e Pix R$ 0,49/transação, sem mistura presumida. Plano-base: ${recipes.toFixed(3)} receitas equivalentes; faixa informada 56–64/mês. Rendimento e custos realizados dependem dos apontamentos e compras. Bordinhas 100 g/R$ 6; bombom cerca de 50 g de cobertura; kit4 sem embalagem interna. Custos planejados em 3 casas; FIFO preserva frações exatas.`
assert.ok(description.length <= 1000)
draft.description = description
const candidate = {
  reference,
  source: 'Workbook + confirmações da conversa em 18/10/2026',
  fixedMonthlyCosts: '2288.00',
  fees,
  recipeCostReference: recipeCost.toFixed(12),
  recovery: {
    mode: 'weighed',
    bakedWeightGrams: '850.000',
    packWeightGrams: '100.000',
    operationalInput: 'batch_totals',
  },
  productionDays: 4,
  laborDaily: '150.00',
  laborMonthlyIncluded: '600.00',
  recipesPerDay: [14, 16],
  description,
  draft,
  normalizedMix,
  projection,
  requiredRecovery: { recipes, grams: 0, ratio: 0 },
  opportunisticProduct: {
    sku: 'PROD002',
    price: '6.00',
    minimumVolume: null,
    referenceCostPer100g: ((recipeCost * 100) / 850 + 0.27).toFixed(3),
    realizedSalesCountInCombinedProfit: true,
  },
  paymentComparisons: calculatePaymentTargets(draft, productStates, fees),
}
const payloadHash = hash(JSON.stringify(candidate))
const schemaReference = `${reference}:schema`
const journal = JSON.parse(
  readFileSync('drizzle/pending-profile-materials/meta/_journal.json', 'utf8'),
)
const migrations = journal.entries
  .filter((entry: { idx: number }) => entry.idx >= 31)
  .map((entry: { tag: string; when: number }) => ({
    ...entry,
    sql: readFileSync(
      `drizzle/pending-profile-materials/${entry.tag}.sql`,
      'utf8',
    ),
  }))
assert.equal(migrations.length, 2)
const preSchema = [
  `SELECT pg_advisory_xact_lock(hashtextextended(${q(reference)},0))`,
  `DO $$ BEGIN IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 33 THEN RAISE EXCEPTION 'RECEIPTS_CHANGED'; END IF; IF EXISTS(SELECT 1 FROM operational_audit_events WHERE operation_reference=${q(schemaReference)}) THEN RAISE EXCEPTION 'REFERENCE_CONSUMED'; END IF; IF (SELECT array_agg(enumlabel::text ORDER BY enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='production_profile_component_role') <> ARRAY['filling'] THEN RAISE EXCEPTION 'ENUM_DRIFT'; END IF; END $$`,
]
for (const receipt of receipts)
  preSchema.push(
    `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash=${q(receipt.hash)} AND created_at=${q(receipt.created_at)}::bigint) THEN RAISE EXCEPTION 'RECEIPT_HASH_DRIFT'; END IF; END $$`,
  )
for (const migration of migrations) {
  preSchema.push(
    ...migration.sql
      .split('--> statement-breakpoint')
      .filter((sql: string) => sql.trim()),
  )
  preSchema.push(
    `INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES(${q(hash(migration.sql))},${migration.when})`,
  )
}
preSchema.push(
  `INSERT INTO operational_audit_events(action,entity_type,entity_id,operation_reference,reason) VALUES('schema.apply','release',${q(reference)},${q(schemaReference)},${j({ authorization: 'Pode fazer tudo e publicar', migrations: migrations.map((m: { tag: string; sql: string }) => ({ tag: m.tag, sha256: hash(m.sql) })) })}::text)`,
)
const statements: string[] = [
  `SELECT pg_advisory_xact_lock(hashtextextended(${q(reference)},0))`,
  `DO $$ BEGIN IF EXISTS(SELECT 1 FROM historical_import_records WHERE source_key=${q(reference)} OR source_hash=${q(payloadHash)}) OR EXISTS(SELECT 1 FROM operational_audit_events WHERE operation_reference=${q(reference)}) THEN RAISE EXCEPTION 'REFERENCE_CONSUMED'; END IF; IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>35 THEN RAISE EXCEPTION 'SCHEMA_NOT_READY'; END IF; IF EXISTS(SELECT 1 FROM production_batches) THEN RAISE EXCEPTION 'REVIEW_EXISTING_BATCHES'; END IF; IF (SELECT count(*) FROM production_profiles)<>17 OR (SELECT count(*) FROM production_profile_components)<>12 THEN RAISE EXCEPTION 'PROFILE_DRIFT'; END IF; IF NOT EXISTS(SELECT 1 FROM management_scenarios WHERE id=1 AND status='draft' AND revision=1) OR EXISTS(SELECT 1 FROM management_scenarios WHERE status='active') THEN RAISE EXCEPTION 'SCENARIO_CHANGED'; END IF; END $$`,
  `CREATE TEMP TABLE release_before(table_name text,row_data jsonb) ON COMMIT DROP`,
  `DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t.tablename); EXECUTE format('INSERT INTO pg_temp.release_before SELECT %L,to_jsonb(r) FROM public.%I r',t.tablename,t.tablename); END LOOP; END $$`,
]
const fingerprints: Record<string, string> = JSON.parse(
  readFileSync('evidence/profile-materials-preflight-2026-10-18.json', 'utf8'),
).fingerprints
for (const [table, expected] of Object.entries(fingerprints)) {
  assert.match(table, /^[a-z_]+$/)
  const row = "to_jsonb(t)-'created_at'-'updated_at'-'payment_fees'"
  statements.push(
    `DO $$ BEGIN IF (SELECT md5(coalesce(jsonb_agg(${row} ORDER BY (${row})::text),'[]'::jsonb)::text) FROM public.${table} t) <> ${q(expected)} THEN RAISE EXCEPTION 'SOURCE_DRIFT_${table}'; END IF; END $$`,
  )
}

const recipeId = `(SELECT id FROM recipe_versions WHERE source_id='RECIPE-BASE-002')`
const id = (sku: string) => `(SELECT id FROM products WHERE sku=${q(sku)})`
const h = (expression: string) =>
  `encode(sha256(convert_to(${expression},'UTF8')),'hex')`
statements.push(
  `UPDATE products SET sale_price=6.00,description='Pacote de 100 g de massa aproveitada após o corte. Um saquinho e um adesivo.',updated_at=now() WHERE sku='PROD002'`,
  `UPDATE products SET name='Chocolate em pó Melken 50%',description=concat_ws(' / ',description,'Especificação confirmada: Melken 50% em pó; referência R$ 60/kg.'),updated_at=now() WHERE sku='INS003'`,
  `INSERT INTO products(sku,name,description,product_type,measurement_unit,category_id,is_active) SELECT 'EMB-BORDINHAS-100G','Saquinho Bordinhas 100 g','Referência confirmada: R$ 0,11/unidade. Identidade própria, sem fusão com outras embalagens.','packaging','unit',category_id,true FROM products WHERE sku='INS007'`,
)
statements.push(
  `INSERT INTO recipe_versions(source_id,source_hash,name,version,status,source_payload) SELECT 'RECIPE-BASE-002',${q(hash(payloadHash + ':recipe'))},'Receita-base — 850 g frios',2,'active',source_payload || ${j({ recovery: candidate.recovery, reference, sourceRecipeId: 1, formDimensionsCm: ['44', '31.3', '3'], costPlanning: { laborIncludedInFixed: true, energyIncludedInFixed: true } })} FROM recipe_versions WHERE source_id='RECIPE-BASE-001'`,
  `UPDATE recipe_versions SET status='archived',updated_at=now() WHERE source_id='RECIPE-BASE-001'`,
)
statements.push(
  `INSERT INTO recipe_items(source_key,source_hash,recipe_version_id,product_id,quantity,unit,source_name,historical_cost,source_payload) SELECT ${q(reference + ':item:')}||id,${h(q(reference + ':item:') + '||id')},${recipeId},product_id,quantity,unit,source_name,historical_cost,source_payload||jsonb_build_object('previousRecipeItemId',id,'reference',${q(reference)}) FROM recipe_items WHERE recipe_version_id=1`,
)
statements.push(
  `INSERT INTO recipe_operational_requirements(source_key,source_hash,recipe_version_id,type,quantity,unit,historical_cost,source_payload) SELECT ${q(reference + ':operational:')}||type::text,${h(q(reference + ':operational:') + '||type::text')},${recipeId},type,1,'batch',NULL,jsonb_build_object('reference',${q(reference)},'input','explicit_total_per_batch','planningAlreadyIncludedInFixed',true) FROM recipe_operational_requirements WHERE recipe_version_id=1`,
)
statements.push(
  `INSERT INTO production_profiles(source_id,source_hash,recipe_version_id,product_id,cut_size,filling,expected_yield,packaging_product_id,packaging_quantity,source_payload) SELECT 'RECIPE-BASE-002:'||p.sku,${h("'RECIPE-BASE-002:'||p.sku")},${recipeId},pr.product_id,pr.cut_size,pr.filling,CASE WHEN p.sku='PROD002' THEN 0 ELSE pr.expected_yield END,CASE p.sku WHEN 'PROD001' THEN ${id('INS011')} WHEN 'PROD002' THEN ${id('EMB-BORDINHAS-100G')} WHEN 'PROD017' THEN ${id('INS012')} ELSE pr.packaging_product_id END,1,pr.source_payload||jsonb_build_object('previousProfileId',pr.id,'reference',${q(reference)},'operationallyComplete',true,'limitation',NULL,'yieldBasis',CASE WHEN p.sku='PROD002' THEN 'measured_100g_packs' ELSE 'alternative_per_recipe' END) FROM production_profiles pr JOIN products p ON p.id=pr.product_id WHERE pr.recipe_version_id=1`,
)
statements.push(
  `INSERT INTO production_profile_components(source_id,source_hash,production_profile_id,product_id,role,quantity,unit,quantity_basis,source_payload) SELECT ${q(reference + ':filling:')}||c.id,${h(q(reference + ':filling:') + '||c.id')},n.id,c.product_id,c.role,c.quantity,c.unit,c.quantity_basis,c.source_payload||jsonb_build_object('previousComponentId',c.id,'reference',${q(reference)}) FROM production_profile_components c JOIN production_profiles old ON old.id=c.production_profile_id JOIN production_profiles n ON n.recipe_version_id=${recipeId} AND n.product_id=old.product_id WHERE old.recipe_version_id=1`,
)
statements.push(
  `INSERT INTO production_profile_components(source_id,source_hash,production_profile_id,product_id,role,quantity,unit,quantity_basis,source_payload) SELECT ${q(reference + ':adhesive:')}||p.sku,${h(q(reference + ':adhesive:') + '||p.sku')},pr.id,${id('INS006')},'packaging',1,'unit','per_finished_unit',${j({ reference, decision: 'one adhesive per sold package' })} FROM production_profiles pr JOIN products p ON p.id=pr.product_id WHERE pr.recipe_version_id=${recipeId}`,
)
statements.push(
  `INSERT INTO production_profile_components(source_id,source_hash,production_profile_id,product_id,role,quantity,unit,quantity_basis,source_payload) SELECT ${q(reference + ':coating:')}||p.sku,${h(q(reference + ':coating:') + '||p.sku')},pr.id,${id('INS019')},'coating',CASE p.sku WHEN 'PROD001' THEN 50 ELSE 200 END,'g','per_finished_unit',${j({ reference, decision: 'approximately 50g coating per bombom; four direct in kit' })} FROM production_profiles pr JOIN products p ON p.id=pr.product_id WHERE pr.recipe_version_id=${recipeId} AND p.sku IN ('PROD001','PROD017')`,
)
statements.push(
  `UPDATE management_settings SET fixed_monthly_costs=2288,payment_fees=${j(fees)},version=version+1,updated_at=now() WHERE id=1 AND version=1`,
)
const newScenarioId = `(SELECT id FROM management_scenarios WHERE supersedes_scenario_id=1 AND version=2)`
statements.push(
  `UPDATE management_scenarios SET status='archived',revision=revision+1,archived_at=now(),archived_by_auth_user_id='codex:authorized-hml-release',archive_reason='Substituído por versão de custos e meta conjunta; histórico preservado.',updated_at=now() WHERE id=1 AND status='draft' AND revision=1`,
)
statements.push(
  `INSERT INTO management_scenario_history(scenario_id,revision,scenario_version,event,actor_auth_user_id,reason,snapshot) SELECT id,revision,version,'archived','codex:authorized-hml-release',${q(reference)},jsonb_build_object('scenario',to_jsonb(s),'mix',(SELECT jsonb_agg(to_jsonb(m) ORDER BY product_id) FROM management_scenario_mix m WHERE m.scenario_id=s.id)) FROM management_scenarios s WHERE id=1`,
)
statements.push(
  `INSERT INTO management_scenarios(scenario_key,version,revision,supersedes_scenario_id,name,description,status,effective_on,monthly_profit_goal,fixed_monthly_costs,sales_days_per_month,weeks_per_month,minimum_margin_bps,fee_tax_reserve_bps,created_by_auth_user_id,updated_by_auth_user_id,replacement_reason) SELECT scenario_key,2,1,id,${q(draft.name)},${q(description)},'draft','2026-10-18',10000,2288,20,4,7000,0,'codex:authorized-hml-release','codex:authorized-hml-release','Meta conjunta, custos revistos e Bordinhas conforme aproveitamento real.' FROM management_scenarios WHERE id=1`,
)
for (const row of normalizedMix)
  statements.push(
    `INSERT INTO management_scenario_mix(scenario_id,product_id,product_name,original_weight,normalized_weight_bps,planned_unit_price,planned_unit_cost) VALUES(${newScenarioId},${row.productId},${q(requireDefined(byId.get(row.productId)).name)},${q(row.originalWeight)},${row.normalizedWeightBps},${q(row.plannedUnitPrice)},${q(row.plannedUnitCost)})`,
  )
statements.push(
  `INSERT INTO management_scenario_history(scenario_id,revision,scenario_version,event,actor_auth_user_id,reason,snapshot) SELECT id,revision,version,'created','codex:authorized-hml-release',${q(reference)},jsonb_build_object('scenario',to_jsonb(s),'mix',(SELECT jsonb_agg(to_jsonb(m) ORDER BY product_id) FROM management_scenario_mix m WHERE m.scenario_id=s.id),'assumptions',${j(candidate)}) FROM management_scenarios s WHERE id=${newScenarioId}`,
)
statements.push(
  `INSERT INTO historical_import_records(source_key,source_hash,entity_type,source_sheet,payload) VALUES(${q(reference)},${q(payloadHash)},'profile_cost_revision','workbook + user decisions',${j(candidate)})`,
)
const mutable = [
  'products',
  'recipe_versions',
  'management_settings',
  'management_scenarios',
  'management_scenario_mix',
]
const audited = [
  ...mutable,
  'recipe_items',
  'recipe_operational_requirements',
  'production_profiles',
  'production_profile_components',
  'management_scenario_history',
  'historical_import_records',
]
for (const table of audited)
  statements.push(
    `INSERT INTO operational_audit_events(action,entity_type,entity_id,operation_reference,reason) SELECT CASE WHEN b.row_data IS NULL THEN 'release.create' ELSE 'release.update' END,${q(table)},to_jsonb(a)->>'id',${q(reference)},jsonb_build_object('authorization','Pode fazer tudo e publicar','before',b.row_data,'after',to_jsonb(a))::text FROM public.${table} a LEFT JOIN pg_temp.release_before b ON b.table_name=${q(table)} AND b.row_data->>'id'=to_jsonb(a)->>'id' WHERE b.row_data IS DISTINCT FROM to_jsonb(a)`,
  )
statements.push(
  `DO $$ DECLARE t record; different boolean; BEGIN FOR t IN SELECT DISTINCT table_name FROM pg_temp.release_before WHERE table_name NOT IN (${[...mutable, 'recipe_items', 'recipe_operational_requirements', 'production_profiles', 'production_profile_components', 'management_scenario_history', 'historical_import_records', 'operational_audit_events'].map(q).join(',')}) LOOP EXECUTE format('SELECT EXISTS((SELECT row_data FROM pg_temp.release_before WHERE table_name=%L EXCEPT SELECT to_jsonb(r) FROM public.%I r) UNION ALL (SELECT to_jsonb(r) FROM public.%I r EXCEPT SELECT row_data FROM pg_temp.release_before WHERE table_name=%L))',t.table_name,t.table_name,t.table_name,t.table_name) INTO different; IF different THEN RAISE EXCEPTION 'UNRELATED_TABLE_CHANGED: %',t.table_name; END IF; END LOOP; IF (SELECT count(*) FROM production_profiles WHERE recipe_version_id=${recipeId})<>17 OR (SELECT count(*) FROM production_profile_components c JOIN production_profiles p ON p.id=c.production_profile_id WHERE p.recipe_version_id=${recipeId})<>31 OR (SELECT count(*) FROM recipe_items WHERE recipe_version_id=${recipeId})<>7 OR (SELECT sum(normalized_weight_bps) FROM management_scenario_mix WHERE scenario_id=${newScenarioId})<>10000 THEN RAISE EXCEPTION 'POSTCONDITION_FAILED'; END IF; END $$`,
)
for (const table of [
  'management_scenario_mix',
  'recipe_items',
  'recipe_operational_requirements',
  'production_profiles',
  'production_profile_components',
  'management_scenario_history',
  'historical_import_records',
  'operational_audit_events',
])
  statements.push(
    `DO $$ BEGIN IF EXISTS(SELECT row_data FROM pg_temp.release_before WHERE table_name=${q(table)} EXCEPT SELECT to_jsonb(r) FROM public.${table} r) THEN RAISE EXCEPTION 'EXISTING_ROW_CHANGED_${table}'; END IF; END $$`,
  )
const output = {
  reference,
  payloadHash,
  schemaReference,
  migrations: migrations.map(
    (m: { tag: string; sql: string; when: number }) => ({
      tag: m.tag,
      sha256: hash(m.sql),
      when: m.when,
    }),
  ),
  schemaStatements: preSchema,
  dataStatements: statements,
  candidate,
}
writeFileSync(
  'evidence/profile-materials-release-2026-10-18.json',
  JSON.stringify(output, null, 2) + '\n',
)
writeFileSync(
  'evidence/profile-materials-schema-2026-10-18.sql',
  'BEGIN;\n' + preSchema.join(';\n') + ';\nCOMMIT;\n',
)
writeFileSync(
  'evidence/profile-materials-data-2026-10-18.sql',
  'BEGIN;\n' + statements.join(';\n') + ';\nCOMMIT;\n',
)
console.log(
  JSON.stringify({
    reference,
    payloadHash,
    schemaStatements: preSchema.length,
    dataStatements: statements.length,
    requiredRecovery: candidate.requiredRecovery,
    baseRevenue: projection.targetRevenue,
    paymentComparisons: candidate.paymentComparisons,
  }),
)
