#!/usr/bin/env node
// Offline validator. It never opens a database connection or loads dotenv.
import { readFileSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const target = {
  environment: 'hml',
  project: 'cool-base-25902164',
  branch: 'br-lively-term-ac9i0mvr',
  database: 'neondb',
}

function fail(message) {
  throw new Error(message)
}

function options(argv) {
  const result = {}
  const allowed = new Set([
    'mode',
    'environment',
    'project',
    'branch',
    'database',
    'ack-read-only',
    'evidence',
    'expected-ci-sha',
    'expected-ci-run-id',
  ])
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    if (
      !key?.startsWith('--') ||
      !allowed.has(key.slice(2)) ||
      !argv[i + 1] ||
      result[key.slice(2)]
    )
      fail('argumentos inválidos')
    result[key.slice(2)] = argv[i + 1]
  }
  if (!['pre', 'post'].includes(result.mode)) fail('modo inválido')
  for (const [key, value] of Object.entries(target)) {
    if (result[key] !== value) fail(`alvo ${key} não autorizado`)
  }
  if (result['ack-read-only'] !== 'hml-read-only')
    fail('confirmação de leitura ausente')
  if (
    !/^[0-9a-f]{40}$/.test(result['expected-ci-sha'] ?? '') ||
    !/^[1-9]\d*$/.test(result['expected-ci-run-id'] ?? '')
  )
    fail('identidade esperada da CI ausente ou inválida')
  if (!result.evidence || /^\.env/i.test(basename(result.evidence)))
    fail('arquivo de evidência inválido')
  if (/^\.env/i.test(basename(realpathSync(result.evidence))))
    fail('arquivo de evidência inválido')
  return result
}

function expectedMigrations(last) {
  const journal = JSON.parse(
    readFileSync(resolve(root, 'drizzle/meta/_journal.json'), 'utf8'),
  )
  if (journal.entries.length !== 29) fail('journal alterado')
  return journal.entries.slice(0, last + 1).map((entry, i) => {
    if (entry.idx !== i) fail('journal fora de ordem')
    const sql = readFileSync(resolve(root, `drizzle/${entry.tag}.sql`))
    return {
      created_at: String(entry.when),
      hash: createHash('sha256').update(sql).digest('hex'),
    }
  })
}

function expectedSchema(last) {
  const snapshot = JSON.parse(
    readFileSync(
      resolve(
        root,
        `drizzle/meta/${String(last).padStart(4, '0')}_snapshot.json`,
      ),
      'utf8',
    ),
  )
  const tables = Object.fromEntries(
    Object.entries(snapshot.tables).map(([name, table]) => [
      name,
      {
        columns: Object.keys(table.columns).sort(),
        indexes: Object.keys(table.indexes).sort(),
        foreign_keys: Object.keys(table.foreignKeys).sort(),
        checks: Object.keys(table.checkConstraints).sort(),
        uniques: Object.keys(table.uniqueConstraints).sort(),
        definitions: {
          columns: table.columns,
          indexes: table.indexes,
          foreign_keys: table.foreignKeys,
          checks: table.checkConstraints,
          uniques: table.uniqueConstraints,
          primary_keys: table.compositePrimaryKeys,
          policies: table.policies,
          rls_enabled: table.isRLSEnabled,
        },
      },
    ]),
  )
  const manualChecks = {
    'public.inventory_cost_allocations': [
      'inventory_cost_allocations_cost_check',
      'inventory_cost_allocations_quantity_check',
    ],
    'public.inventory_cost_layers': [
      'inventory_cost_layers_cost_check',
      'inventory_cost_layers_quantity_check',
    ],
    'public.inventory_cost_reversals': [
      'inventory_cost_reversals_cost_check',
      'inventory_cost_reversals_quantity_check',
    ],
  }
  if (last === 28) {
    manualChecks['public.financial_events'] = [
      'financial_events_amount_check',
      'financial_events_authorization_check',
      'financial_events_correction_check',
      'financial_events_redemption_effect_check',
      'financial_events_settlement_check',
    ]
    manualChecks['public.financial_periods'] = [
      'financial_periods_closure_check',
      'financial_periods_month_start_check',
    ]
  }
  for (const [name, checks] of Object.entries(manualChecks)) {
    tables[name].checks = [...tables[name].checks, ...checks].sort()
  }
  return { tables, enums: snapshot.enums }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  return value
}

function compare(expected, actual, label) {
  if (JSON.stringify(canonical(expected)) !== JSON.stringify(canonical(actual)))
    fail(`divergência em ${label}`)
}

export function validate(argv) {
  const args = options(argv)
  const evidence = JSON.parse(readFileSync(args.evidence, 'utf8'))
  for (const [key, value] of Object.entries(target)) {
    if (evidence[key] !== value) fail(`identidade ${key} divergente`)
  }
  if (
    evidence.transaction_read_only !== true ||
    evidence.role_can_write !== false
  )
    fail('leitura estrita não comprovada')
  if (
    !Number.isInteger(evidence.server_version_num) ||
    evidence.server_version_num < 170000
  )
    fail('versão PostgreSQL não confirmada')
  if (
    evidence.ci?.conclusion !== 'success' ||
    evidence.ci.status !== 'completed' ||
    evidence.ci.sha !== args['expected-ci-sha'] ||
    String(evidence.ci.run_id) !== args['expected-ci-run-id'] ||
    evidence.ci.repository !== 'naiguelcabral/seus-brownies' ||
    evidence.ci.workflow !== 'CI' ||
    evidence.ci.event !== 'push' ||
    evidence.ci.branch !== 'main'
  )
    fail('CI verde no SHA não comprovada')
  if (args.mode === 'pre' && evidence.backup?.verified !== true)
    fail('backup não verificado')
  const last = args.mode === 'pre' ? 16 : 28
  const expected = expectedMigrations(last)
  if (
    !Array.isArray(evidence.migrations) ||
    evidence.migrations.length !== expected.length
  )
    fail('quantidade de migrations divergente')
  compare(
    expected,
    evidence.migrations.map((row) => ({
      created_at: String(row.created_at),
      hash: row.hash,
    })),
    'histórico e hashes',
  )
  const { tables: schema, enums } = expectedSchema(last)
  if (!evidence.tables || typeof evidence.tables !== 'object')
    fail('catálogo ausente')
  for (const [tableName, table] of Object.entries(schema)) {
    const observed = evidence.tables[tableName]
    if (!observed) fail(`tabela ausente: ${tableName}`)
    for (const key of [
      'columns',
      'indexes',
      'foreign_keys',
      'checks',
      'uniques',
    ]) {
      if (!Array.isArray(observed[key]))
        fail(`catálogo incompleto: ${tableName}.${key}`)
      compare(table[key], [...observed[key]].sort(), `${tableName}.${key}`)
    }
    compare(table.definitions, observed.definitions, `${tableName}.definitions`)
  }
  if (Object.keys(evidence.tables).length !== Object.keys(schema).length)
    fail('tabelas extras ou ausentes')
  compare(enums, evidence.enums, 'enums e ordem dos valores')
  compare(
    args.mode === 'post'
      ? ['financial_events_immutable', 'products_preserve_used_structure']
      : [],
    [...(evidence.triggers ?? [])].sort(),
    'gatilhos manuais',
  )
  return {
    mode: args.mode,
    migrations: expected.length,
    tables: Object.keys(schema).length,
    ci_sha: evidence.ci.sha,
    ci_run_id: String(evidence.ci.run_id),
    evidence_scope: 'supplied-json-and-drizzle-snapshots',
    application_authorized: false,
    remaining_gates: [
      'independent-evidence-provenance',
      'worker-database-association',
      'manual-sql-function-and-trigger-definitions',
      'shared-database-migration-inventory',
      '0019-financial-data-decision',
      '0028-scenario-data-decision',
      'backup-recovery-window-and-explicit-application-approval',
    ],
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(JSON.stringify(validate(process.argv.slice(2))) + '\n')
  } catch (error) {
    process.stderr.write(`BLOCKED: ${error.message}\n`)
    process.exitCode = 1
  }
}
