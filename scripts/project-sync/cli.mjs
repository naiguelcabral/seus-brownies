import { resolve, dirname } from 'node:path'
import { config, schemaFingerprint, configureBindings } from './config.mjs'
import { privateState, readInput } from './state.mjs'
import { Exchange, toolNames } from './bridge.mjs'
import { GitHubClient, NotionClient } from './clients.mjs'
import { plan, apply, dashboard, validatePlan } from './engine.mjs'
import { invariant, safe, errorCode } from './model.mjs'

function argumentsFor(argv) {
  const [mode, ...rest] = argv
  const args = { mode }
  invariant(
    [
      'read-only',
      'dry-run',
      'apply',
      'pending',
      'respond',
      'recover',
      'status',
    ].includes(mode),
    'invalid_mode',
  )
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]
    invariant(
      [
        '--state',
        '--plan',
        '--digest',
        '--only',
        '--id',
        '--json',
        '--dashboard',
      ].includes(key) &&
        rest[index + 1] &&
        !args[key.slice(2)],
      'invalid_argument',
    )
    args[key.slice(2)] = rest[index + 1]
  }
  const allowed = {
    'read-only': ['state', 'only', 'dashboard'],
    'dry-run': ['state', 'only', 'dashboard'],
    apply: ['state', 'plan', 'digest'],
    pending: ['state'],
    respond: ['state', 'id', 'json'],
    recover: ['state'],
    status: ['state'],
  }
  invariant(
    Object.keys(args)
      .filter((k) => k !== 'mode')
      .every((k) => allowed[mode].includes(k)),
    'invalid_argument',
  )
  return args
}
let activeState
async function main() {
  const args = argumentsFor(process.argv.slice(2))
  const state = privateState(
    resolve(args.state ?? '.codex-local/project-sync/session'),
    process.cwd(),
  )
  await state.init()
  activeState = state
  if (args.mode === 'status') {
    const latest = await state.read('last-run.json')
    console.log(
      JSON.stringify({
        available: Boolean(latest),
        at: latest && /^\d{4}-\d{2}-\d{2}T/.test(latest.at) ? latest.at : null,
        plan: /^[a-f0-9]{64}$/.test(latest?.result?.plan)
          ? latest.result.plan
          : null,
        next: 'Resume via dry-run or apply with the reviewed digest; never automatic on startup.',
      }),
    )
    return
  }
  if (args.mode === 'pending') {
    const request = await state.read('request.json', null)
    console.log(JSON.stringify(request))
    return
  }
  if (args.mode === 'respond') {
    const request = await state.read('request.json')
    invariant(
      request &&
        request.id === args.id &&
        toolNames[request.method] === request.tool,
      'response_mismatch',
    )
    const response = safe(JSON.parse(args.json))
    await state.write('response.json', { id: args.id, result: response })
    return
  }
  if (args.mode === 'recover') {
    await state.recoverLock()
    console.log(
      JSON.stringify({
        result: 'lock_recovered',
        next: 'dry-run or apply using the same plan digest',
      }),
    )
    return
  }
  configureBindings(
    await readInput(resolve('.codex-local/project-sync/bindings.json')),
  )
  await state.lock()
  try {
    const transport = new Exchange(state, { write: args.mode === 'apply' })
    const github = new GitHubClient(transport),
      notion = new NotionClient(transport)
    let result
    if (args.mode === 'apply') {
      invariant(args.plan && args.digest, 'missing_apply_contract')
      invariant(args.plan.endsWith('.json'), 'plan_read_scope')
      privateState(dirname(resolve(args.plan)), process.cwd())
      const value = validatePlan(await readInput(args.plan))
      result = await apply(value, {
        github,
        notion,
        state,
        digest: args.digest,
      })
      // Dashboard is a separate explicit plan, not an implicit side effect of apply.
    } else {
      const snapshot = {
        github: await github.collect(),
        notion: await notion.collect(),
      }
      if (args.only) {
        invariant(
          snapshot.github.observations.some((item) => item.key === args.only),
          'unknown_identity',
        )
        snapshot.github.observations = snapshot.github.observations.filter(
          (item) => item.key === args.only,
        )
      }
      if (args.dashboard !== 'yes') delete snapshot.notion.dashboard
      const value = plan(snapshot)
      await state.write('plan.json', value)
      result = {
        mode: args.mode,
        plan: value.digest,
        operations: value.operations.map((op) => ({
          key: op.item.key,
          kind: op.kind,
          reason: op.reason,
        })),
        dashboard: dashboard(snapshot),
        source: { main: snapshot.github.main, repository: config.repository },
        schema: schemaFingerprint(),
      }
    }
    await state.write('last-run.json', {
      at: new Date().toISOString(),
      result,
      next:
        result.complete === false
          ? 'review conflicts/uncertain writes before retry'
          : 'review dry-run; no recurring execution enabled',
    })
    console.log(JSON.stringify(result))
    if (result.complete === false) process.exitCode = 20
  } finally {
    await state.unlock()
  }
}
main().catch(async (error) => {
  if (activeState) {
    try {
      await activeState.write('last-failure.json', {
        at: new Date().toISOString(),
        code: errorCode(error),
        next: 'Review capabilities/checkpoint; no blind retry.',
      })
    } catch {
      /* Do not leak a secondary filesystem error. */
    }
  }
  console.error(
    JSON.stringify({
      result: 'blocked',
      code: errorCode(error),
      next: 'check pending request, tool access and private checkpoint; no blind write retry',
    }),
  )
  process.exitCode = 20
})
