import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const root = resolve(import.meta.dirname, '..')
const script = resolve(root, 'scripts/hml-migration-readiness.mjs')
const journal = JSON.parse(
  readFileSync(resolve(root, 'drizzle/meta/_journal.json'), 'utf8'),
)

function fixture(last: number) {
  const snapshot = JSON.parse(
    readFileSync(
      resolve(
        root,
        `drizzle/meta/${String(last).padStart(4, '0')}_snapshot.json`,
      ),
      'utf8',
    ),
  )
  const data = {
    environment: 'hml',
    project: 'cool-base-25902164',
    branch: 'br-lively-term-ac9i0mvr',
    database: 'neondb',
    transaction_read_only: true,
    role_can_write: false,
    server_version_num: 170000,
    ci: {
      sha: 'a'.repeat(40),
      conclusion: 'success',
      status: 'completed',
      run_id: '37930101604',
      repository: 'naiguelcabral/seus-brownies',
      workflow: 'CI',
      event: 'push',
      branch: 'main',
    },
    enums: snapshot.enums,
    backup: { verified: true },
    triggers:
      last === 28
        ? ['financial_events_immutable', 'products_preserve_used_structure']
        : [],
    migrations: journal.entries
      .slice(0, last + 1)
      .map((entry: { tag: string; when: number }) => ({
        created_at: String(entry.when),
        hash: createHash('sha256')
          .update(readFileSync(resolve(root, `drizzle/${entry.tag}.sql`)))
          .digest('hex'),
      })),
    tables: Object.fromEntries(
      Object.entries(snapshot.tables).map(([name, raw]) => {
        const table = raw as Record<string, Record<string, unknown>> & {
          isRLSEnabled: boolean
        }
        return [
          name,
          {
            ...Object.fromEntries(
              [
                ['columns', 'columns'],
                ['indexes', 'indexes'],
                ['foreign_keys', 'foreignKeys'],
                ['checks', 'checkConstraints'],
                ['uniques', 'uniqueConstraints'],
              ].map(([output, input]) => [
                output,
                Object.keys(table[input]).sort(),
              ]),
            ),
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
        ]
      }),
    ),
  }
  const tables = data.tables as unknown as Record<string, { checks: string[] }>
  const manualChecks: Record<string, string[]> = {
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
    tables[name].checks.push(...checks)
    tables[name].checks.sort()
  }
  return data
}

function run(
  mode: 'pre' | 'post',
  evidence: ReturnType<typeof fixture>,
  branch = 'br-lively-term-ac9i0mvr',
  expectedSha = 'a'.repeat(40),
  extraArgs: string[] = [],
) {
  const dir = mkdtempSync(join(tmpdir(), 'cacau-readiness-fixture-'))
  const path = join(dir, 'evidence.json')
  writeFileSync(path, JSON.stringify(evidence))
  try {
    const result = spawnSync(
      process.execPath,
      [
        script,
        '--mode',
        mode,
        '--environment',
        'hml',
        '--project',
        'cool-base-25902164',
        '--branch',
        branch,
        '--database',
        'neondb',
        '--ack-read-only',
        'hml-read-only',
        '--evidence',
        path,
        '--expected-ci-sha',
        expectedSha,
        '--expected-ci-run-id',
        '37930101604',
        ...extraArgs,
      ],
      { encoding: 'utf8' },
    )
    assert.ifError(result.error)
    return result
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('accepts exact pre and post catalog evidence', () => {
  const pre = run('pre', fixture(16))
  assert.equal(pre.status, 0, pre.stderr)
  assert.equal(run('post', fixture(28)).status, 0)
  const report = JSON.parse(pre.stdout)
  assert.equal(report.application_authorized, false)
  assert.ok(report.remaining_gates.includes('0019-financial-data-decision'))
  assert.ok(report.remaining_gates.includes('0028-scenario-data-decision'))
})

test('rejects CI from another SHA, run, repository, event or branch', () => {
  const base = fixture(16)
  for (const ci of [
    { sha: 'b'.repeat(40) },
    { run_id: '37930101605' },
    { repository: 'someone/else' },
    { event: 'pull_request' },
    { branch: 'codex/work' },
    { workflow: 'Deploy' },
    { conclusion: 'failure' },
    { status: 'in_progress' },
  ])
    assert.notEqual(
      run('pre', { ...base, ci: { ...base.ci, ...ci } }).status,
      0,
    )
  assert.notEqual(run('pre', base, base.branch, '').status, 0)
  assert.notEqual(
    run('pre', base, base.branch, base.ci.sha, ['--unknown', 'value']).status,
    0,
  )
})

test('rejects definition drift even when catalog names are unchanged', () => {
  for (const [object, field, replacement] of [
    ['columns', 'sale_price', { type: 'numeric(6, 2)' }],
    ['columns', 'is_active', { default: false }],
    ['columns', 'sku', { notNull: false }],
    ['columns', 'id', { primaryKey: false }],
    [
      'foreign_keys',
      'products_category_id_categories_id_fk',
      { onDelete: 'cascade' },
    ],
    ['uniques', 'products_sku_unique', { columns: ['name'] }],
  ] as const) {
    const data = fixture(16)
    const defs = data.tables['public.products']
      .definitions as unknown as Record<
      string,
      Record<string, Record<string, unknown>>
    >
    defs[object][field] = { ...defs[object][field], ...replacement }
    const result = run('pre', data)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /public.products.definitions/)
  }
  const data = fixture(28)
  const defs = data.tables['public.management_scenario_mix']
    .definitions as unknown as Record<
    string,
    Record<string, Record<string, unknown>>
  >
  const index = Object.keys(defs.indexes)[0]
  defs.indexes[index].isUnique = !defs.indexes[index].isUnique
  assert.notEqual(run('post', data).status, 0)
})

test('rejects changed checks, RLS and enum values and accepts object key ordering', () => {
  const data = fixture(28)
  const defs = data.tables['public.management_scenario_mix']
    .definitions as unknown as Record<
    string,
    Record<string, Record<string, unknown>>
  >
  const check = Object.keys(defs.checks)[0]
  defs.checks[check].value = 'true'
  assert.notEqual(run('post', data).status, 0)
  const rls = fixture(16)
  rls.tables['public.products'].definitions.rls_enabled = true
  assert.notEqual(run('pre', rls).status, 0)
  const enums = fixture(16)
  enums.enums['public.measurement_unit'].values.reverse()
  assert.notEqual(run('pre', enums).status, 0)
  const reordered = fixture(16)
  const product = reordered.tables['public.products']
  product.definitions = Object.fromEntries(
    Object.entries(product.definitions).reverse(),
  ) as typeof product.definitions
  assert.equal(run('pre', reordered).status, 0)
})

test('rejects ambiguous target, writable role, missing backup and hash drift', () => {
  const base = fixture(16)
  assert.notEqual(run('pre', base, 'production').status, 0)
  assert.notEqual(run('pre', { ...base, role_can_write: true }).status, 0)
  assert.notEqual(
    run('pre', { ...base, backup: { verified: false } }).status,
    0,
  )
  assert.notEqual(
    run('pre', {
      ...base,
      migrations: base.migrations.map(
        (m: { created_at: string; hash: string }, i: number) =>
          i === 16 ? { ...m, hash: '0'.repeat(64) } : m,
      ),
    }).status,
    0,
  )
  assert.notEqual(run('pre', { ...base, tables: {} }).status, 0)
})
