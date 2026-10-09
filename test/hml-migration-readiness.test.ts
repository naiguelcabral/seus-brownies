import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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
    ci: { sha: 'a'.repeat(40), conclusion: 'success' },
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
        const table = raw as Record<string, Record<string, unknown>>
        return [
          name,
          Object.fromEntries(
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
        ]
      }),
    ),
  }
  const tables = data.tables as Record<string, { checks: string[] }>
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
) {
  const dir = mkdtempSync(join(tmpdir(), 'cacau-readiness-fixture-'))
  const path = join(dir, 'evidence.json')
  writeFileSync(path, JSON.stringify(evidence))
  return spawnSync(
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
    ],
    { encoding: 'utf8' },
  )
}

test('accepts exact pre and post catalog evidence', () => {
  assert.equal(run('pre', fixture(16)).status, 0)
  assert.equal(run('post', fixture(28)).status, 0)
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
