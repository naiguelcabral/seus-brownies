import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, symlink, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { config, schemaFingerprint } from './config.mjs'
import {
  stableId,
  fingerprint,
  observation,
  page,
  block,
  safe,
  summarize,
} from './model.mjs'
import { plan, apply, validatePlan, dashboard } from './engine.mjs'
import { State, privateState } from './state.mjs'
import { retryRead, Exchange } from './bridge.mjs'
import { GitHubClient, NotionClient } from './clients.mjs'

const sha = 'a'.repeat(40),
  repository = config.repository
const item = observation('commit', { sha }, repository)
const priorItem = { ...item, evidence: { ...item.evidence, state: 'older' } }
priorItem.fingerprint = fingerprint(priorItem.evidence)
const url = 'https://app.notion.com/p/' + '1'.repeat(32)
const fields = {
  Título: 'technical',
  Projeto: [config.project],
  Status: 'A validar',
  Evidências: 'source',
}
function raw(content, properties = fields) {
  return {
    url,
    text: `<properties>\n${JSON.stringify(properties)}\n</properties>\n<content>\n${content}\n</content>`,
  }
}
function snapshot(records = [], observations = [item]) {
  return {
    github: { repository, main: sha, observations, ci: [], openPrs: 2 },
    notion: {
      schemaVersion: schemaFingerprint(),
      records,
      rows: {
        Tarefas: records.map((r) => r.properties),
        Decisões: [],
        Riscos: [],
      },
    },
  }
}
async function fixture(fn) {
  const directory = await mkdtemp(join(tmpdir(), 'cacau-sync-test-'))
  const state = new State(directory)
  await state.init()
  let records = [],
    creates = 0,
    appends = 0,
    failed = false
  const notion = {
    validateScope: async () => {},
    access: async () => {},
    records: async () => records,
    fetch: async () => raw(records[0].content, records[0].properties),
    create: async (_item, content) => {
      creates++
      records = [page(raw(content))]
      if (failed) throw new Error('secret=do-not-log')
      return url
    },
    append: async (_url, content) => {
      appends++
      records = [
        page(raw(records[0].content + '\n' + content, records[0].properties)),
      ]
    },
  }
  const github = { collect: async () => snapshot().github }
  const context = {
    state,
    notion,
    github,
    get records() {
      return records
    },
    set records(value) {
      records = value
    },
    get creates() {
      return creates
    },
    get appends() {
      return appends
    },
    failCreate() {
      failed = true
    },
  }
  try {
    await fn(context)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
test('stable identities are repository scoped and independent of titles', () => {
  assert.equal(stableId('pr', 38, repository), `github:${repository}:pr:38`)
  assert.throws(() => stableId('pr', '../secret', repository))
  assert.throws(() => stableId('pr', 38, 'other/repo'))
})
test('fingerprints ignore key order, not value changes', () => {
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }))
  assert.notEqual(fingerprint([1, 2]), fingerprint([2, 1]))
})
test('missing source fields fail closed', () => {
  assert.throws(() => observation('commit', {}, repository))
  assert.throws(() =>
    observation('pr', { number: 2, state: 'open' }, repository),
  )
})
test('merge never infers delivered requirement, HML or production', () => {
  const op = observation(
    'pr',
    {
      number: 2,
      state: 'closed',
      draft: false,
      merged_at: 'now',
      head: { sha },
    },
    repository,
  )
  assert.equal(op.evidence.state, 'merged')
  assert.equal(op.evidence.hml, 'unproven')
  assert.equal(op.evidence.production, 'unproven')
})
test('manual legacy record is conflict, never duplicated or adopted', () => {
  const op = observation(
    'pr',
    { number: 2, state: 'open', draft: true, head: { sha } },
    repository,
  )
  const record = page(raw('manual', { ...fields, Título: 'GH-PR-2 — manual' }))
  assert.equal(
    plan(snapshot([record], [op])).operations[0].reason,
    'manual_record_preserved',
  )
})
test('duplicate identities require review', () => {
  const record = page(raw(block(item, new Date().toISOString())))
  assert.equal(
    plan(snapshot([record, record])).operations[0].reason,
    'duplicate_identity',
  )
})
test('incremental observation is unchanged on repeat; source change appends', () => {
  const record = page(raw(block(item, new Date().toISOString())))
  assert.equal(plan(snapshot([record])).operations[0].kind, 'unchanged')
  const changed = { ...item, evidence: { ...item.evidence, state: 'updated' } }
  changed.fingerprint = fingerprint(changed.evidence)
  assert.equal(plan(snapshot([record], [changed])).operations[0].kind, 'append')
})
test('truncated, unknown or altered markers are rejected', () => {
  assert.throws(() => page({ ...raw('manual'), truncated: true }))
  assert.throws(() => page({ ...raw('manual'), unknown_block_count: 1 }))
  assert.throws(() =>
    page(
      raw(
        block(item, 'now').replace(
          /CACAU_SYNC_V1 [a-f0-9]{64}/,
          'CACAU_SYNC_V1 ' + '0'.repeat(64),
        ),
      ),
    ),
  )
})
test('plan tampering and destructive operation rejected', () => {
  const value = plan(snapshot())
  assert.throws(() => validatePlan({ ...value, main: 'b'.repeat(40) }))
  const { digest: _digest, ...body } = value
  body.operations[0].kind = 'delete'
  assert.throws(() => validatePlan({ ...body, digest: fingerprint(body) }))
})
test('controlled create is verified; same plan replay does not duplicate', async () =>
  fixture(async (ctx) => {
    const value = plan(snapshot())
    const a = await apply(value, { ...ctx, digest: value.digest })
    assert.equal(a.results[0].result, 'verified')
    const b = await apply(value, { ...ctx, digest: value.digest })
    assert.equal(b.results[0].result, 'recovered')
    assert.equal(ctx.creates, 1)
  }))
test('interrupted create with unknown reply recovers by durable marker', async () =>
  fixture(async (ctx) => {
    ctx.failCreate()
    const value = plan(snapshot())
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].result,
      'blocked',
    )
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].result,
      'recovered',
    )
    assert.equal(ctx.creates, 1)
    assert.ok(
      !JSON.stringify(await ctx.state.read('operations.json')).includes(
        'do-not-log',
      ),
    )
  }))
test('uncertain create with no visible record cannot be retried blindly', async () =>
  fixture(async (ctx) => {
    const value = plan(snapshot())
    await ctx.state.write('checkpoint.json', {
      version: 1,
      plans: { [value.digest]: { [item.key]: { status: 'intent' } } },
    })
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].code,
      'uncertain_write_requires_review',
    )
    assert.equal(ctx.creates, 0)
  }))
test('concurrent identity prevents create', async () =>
  fixture(async (ctx) => {
    const value = plan(snapshot())
    ctx.records = [page(raw(block(priorItem, 'now')))]
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].code,
      'concurrent_identity',
    )
    assert.equal(ctx.creates, 0)
  }))
test('manual property edits between plan and apply are protected', async () =>
  fixture(async (ctx) => {
    const previous = page(raw(block(priorItem, 'now')))
    const value = plan(snapshot([previous]))
    ctx.records = [
      page(raw(previous.content, { ...fields, Status: 'Bloqueada' })),
    ]
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].code,
      'concurrent_edit',
    )
    assert.equal(ctx.appends, 0)
  }))
test('append preserves manual properties and all old narrative', async () =>
  fixture(async (ctx) => {
    ctx.records = [
      page(
        raw('manual note\n' + block(priorItem, 'now'), {
          ...fields,
          Status: 'Bloqueada',
        }),
      ),
    ]
    const value = plan(snapshot(ctx.records))
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].result,
      'verified',
    )
    assert.equal(ctx.records[0].properties.Status, 'Bloqueada')
    assert.ok(ctx.records[0].content.includes('manual note'))
  }))
test('source change, expired plan and wrong authorization prevent writes', async () =>
  fixture(async (ctx) => {
    const value = plan(snapshot())
    await assert.rejects(apply(value, { ...ctx, digest: 'wrong' }))
    await assert.rejects(
      apply(plan(snapshot(), '2000-01-01T00:00:00Z'), {
        ...ctx,
        digest: value.digest,
      }),
    )
    await assert.rejects(
      apply(value, {
        ...ctx,
        github: {
          collect: async () => ({ ...snapshot().github, main: 'b'.repeat(40) }),
        },
        digest: value.digest,
      }),
    )
    assert.equal(ctx.creates, 0)
  }))
test('rate limits retry bounded reads; fatal errors never leak', async () => {
  let tries = 0
  assert.equal(
    await retryRead(
      async () => {
        if (++tries < 3) throw { status: 429 }
        return 1
      },
      async () => {},
    ),
    1,
  )
  assert.equal(tries, 3)
  await assert.rejects(
    retryRead(async () => {
      throw new Error('Bearer private-token')
    }),
    /provider_failure/,
  )
})
test('GitHub pagination is complete, deduplicated and bounded', async () => {
  let calls = 0
  const client = new GitHubClient({
    call: async () => {
      calls++
      return calls === 1
        ? Array.from({ length: 100 }, (_, id) => ({ id }))
        : [{ id: 100 }]
    },
  })
  assert.equal((await client.paginate('/issues?state=all')).length, 101)
  assert.equal(calls, 2)
  const duplicate = new GitHubClient({
    call: async () => Array.from({ length: 100 }, (_, id) => ({ id })),
  })
  await assert.rejects(
    duplicate.paginate('/issues?state=all'),
    /duplicate_github_page/,
  )
})
test('Notion pagination does not silently accept incomplete result', async () => {
  let calls = 0
  const client = new NotionClient({
    call: async () => {
      calls++
      return {
        has_more: calls === 1,
        next_cursor: calls === 1 ? 'next' : undefined,
        results:
          calls === 1
            ? Array.from({ length: 50 }, (_, id) => ({
                url:
                  'https://app.notion.com/p/' +
                  id.toString(16).padStart(32, '0'),
              }))
            : [],
      }
    },
  })
  const view = {
    text: `<view>\n${JSON.stringify({ dataSourceUrl: config.sources.Tarefas })}\n</view>`,
  }
  client.fetch = async () => view
  assert.equal((await client.rows('Tarefas')).length, 50)
  assert.equal(calls, 2)
  const unavailable = new NotionClient({
    call: async () => ({ message: 'quota' }),
  })
  unavailable.fetch = async () => view
  await assert.rejects(unavailable.rows('Tarefas'), /query_unavailable/)
})
test('log and persisted input refuse credential patterns', () => {
  for (const secret of [
    'Bearer abc.def.ghi',
    'postgresql://user:pass@host/db',
    'ghp_123456789',
    'password=abcdefghi',
  ])
    assert.throws(() => safe({ value: secret }), /sensitive_payload/)
})
test('reports compute actual totals, never illustrative counts', () => {
  assert.deepEqual(
    summarize([{ Status: 'Bloqueada' }, { Status: 'Bloqueada' }, {}]),
    { total: 3, byStatus: { Bloqueada: 2, 'Sem status': 1 } },
  )
  assert.equal(dashboard(snapshot()).openPrs, 2)
})
test('private checkpoint is atomic, locked and symlink safe', async () =>
  fixture(async (ctx) => {
    await ctx.state.write('checkpoint.json', { version: 1 })
    assert.equal(
      (await stat(ctx.state.path('checkpoint.json'))).mode & 0o777,
      0o600,
    )
    await ctx.state.lock()
    await assert.rejects(ctx.state.lock(), /sync_locked/)
    await assert.rejects(ctx.state.recoverLock(), /lock_owner_alive/)
    await ctx.state.unlock()
    await symlink(
      ctx.state.path('checkpoint.json'),
      ctx.state.path('alias.json'),
    )
    await assert.rejects(ctx.state.read('alias.json'), /symlink_refused/)
    assert.throws(
      () => privateState('/tmp/elsewhere', '/project'),
      /state_outside_private_root/,
    )
  }))
test('exchange enforces read-only permissions, deadline and request identity', async () =>
  fixture(async (ctx) => {
    const exchange = new Exchange(ctx.state, { timeout: 10 })
    await assert.rejects(exchange.call('notion.create', {}), /write_forbidden/)
    await assert.rejects(exchange.call('unknown', {}))
    await assert.rejects(exchange.call('notion.fetch', {}), /bridge_timeout/)
  }))
test('partial failure leaves independent verified operations intact', async () =>
  fixture(async (ctx) => {
    const value = plan(snapshot())
    ctx.notion.fetch = async () => {
      throw new Error('connection failed')
    }
    assert.equal(
      (await apply(value, { ...ctx, digest: value.digest })).results[0].result,
      'blocked',
    )
    assert.equal(ctx.creates, 1)
    assert.equal(
      (await ctx.state.read('checkpoint.json')).plans[value.digest][item.key]
        .status,
      'intent',
    )
  }))

test('expired plan is rejected even with its correct authorization digest', async () =>
  fixture(async (ctx) => {
    const value = plan(snapshot(), '2000-01-01T00:00:00Z')
    await assert.rejects(
      apply(value, { ...ctx, digest: value.digest }),
      /plan_expired/,
    )
    assert.equal(ctx.creates, 0)
  }))
test('uncertain writes remain blocked across newly generated plans', async () =>
  fixture(async (ctx) => {
    const old = plan(snapshot(), new Date(Date.now() - 1000).toISOString()),
      fresh = plan(snapshot())
    await ctx.state.write('checkpoint.json', {
      version: 1,
      plans: { [old.digest]: { [item.key]: { status: 'intent' } } },
    })
    assert.equal(
      (await apply(fresh, { ...ctx, digest: fresh.digest })).results[0].code,
      'uncertain_write_requires_review',
    )
    assert.equal(ctx.creates, 0)
  }))
test('dashboard append uses UUID and refuses pages outside validated scope', async () => {
  const calls = [],
    client = new NotionClient({
      call: async (...args) => {
        calls.push(args)
        return {}
      },
    })
  await assert.rejects(client.append(url, 'safe'), /page_write_scope/)
  client.allowedPages.add(url)
  await client.append(url, 'safe')
  assert.equal(calls[0][1].page_id, '11111111-1111-1111-1111-111111111111')
  assert.equal(calls[0][1].command, 'insert_content')
})
test('filtered views are rejected before incomplete counts can be reported', async () => {
  const client = new NotionClient({
    call: async () => {
      throw new Error('must not query')
    },
  })
  client.fetch = async () => ({
    text: `<view>\n${JSON.stringify({ dataSourceUrl: config.sources.Tarefas, simpleFilters: [{ filter: 'hidden' }] })}\n</view>`,
  })
  await assert.rejects(client.rows('Tarefas'), /filtered_view_refused/)
})
test('view cursor must advance and retain the same query scope', async () => {
  const client = new NotionClient({
    call: async () => ({ results: [], has_more: true, next_cursor: 'same' }),
  })
  client.fetch = async () => ({
    text: `<view>\n${JSON.stringify({ dataSourceUrl: config.sources.Tarefas })}\n</view>`,
  })
  await assert.rejects(client.rows('Tarefas'), /invalid_cursor/)
})
test('summary excludes other projects and counts critical blockers from rows', () => {
  const value = snapshot()
  value.notion.rows.Tarefas = [
    { ...fields, Status: 'Bloqueada', Prioridade: 'Crítica' },
    { ...fields, Projeto: ['https://app.notion.com/p/' + '2'.repeat(32)] },
  ]
  assert.equal(dashboard(value).tasks.total, 1)
  assert.equal(dashboard(value).criticalBlocks, 1)
})
test('dashboard plan cannot target a personal page', () => {
  const value = snapshot()
  value.notion.dashboard = { url, version: 'a'.repeat(64) }
  assert.throws(() => validatePlan(plan(value)), /dashboard_scope/)
})
test('dashboard write is verified and replayed without duplicate snapshot', async () =>
  fixture(async (ctx) => {
    const dashUrl = config.dashboard
    let content = 'manual dashboard',
      writes = 0
    const value = snapshot()
    value.github.observations = []
    value.notion.dashboard = page({ ...raw(content), url: dashUrl })
    const target = plan(value)
    ctx.notion.fetch = async () => ({ ...raw(content), url: dashUrl })
    ctx.notion.rows = async () => []
    ctx.notion.dashboard = async (addition) => {
      content += '\n' + addition
      writes++
    }
    assert.equal(
      (await apply(target, { ...ctx, digest: target.digest })).complete,
      true,
    )
    assert.equal(
      (await apply(target, { ...ctx, digest: target.digest })).results[0]
        .result,
      'recovered',
    )
    assert.equal(writes, 1)
    assert.ok(content.startsWith('manual dashboard'))
  }))

test('a failed write does not prevent an independent operation from verifying', async () =>
  fixture(async (ctx) => {
    const independent = observation(
      'issue',
      { number: 91, state: 'open' },
      repository,
    )
    const value = plan(snapshot([], [item, independent]))
    ctx.github.collect = async () => snapshot([], [item, independent]).github
    ctx.notion.create = async (current, content) => {
      if (current.key === item.key) throw new Error('provider unavailable')
      ctx.records = [page(raw(content))]
      return url
    }
    const result = await apply(value, { ...ctx, digest: value.digest })
    assert.deepEqual(
      result.results.map((r) => r.result),
      ['blocked', 'verified'],
    )
    assert.equal(ctx.records[0].marker.key, independent.key)
  }))
