import assert from 'node:assert/strict'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import test from 'node:test'

const sourceScript = fileURLToPath(
  new URL('../scripts/codex/conversation_memory.py', import.meta.url),
)

function fixture<T>(run: (root: string, script: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'cacau-memory-test-'))
  const script = join(root, 'scripts/codex/conversation_memory.py')
  mkdirSync(dirname(script), { recursive: true })
  mkdirSync(join(root, '.git'))
  writeFileSync(join(root, 'AGENTS.md'), '# synthetic fixture\n')
  copyFileSync(sourceScript, script)
  try {
    return run(root, script)
  } finally {
    for (const directory of [
      join(root, '.codex-local/context'),
      join(root, '.codex-local/conversations'),
      join(root, '.codex-local/state'),
      join(root, '.codex-local/archive'),
      join(root, '.codex-local'),
    ]) {
      if (existsSync(directory)) chmodSync(directory, 0o700)
    }
    rmSync(root, { recursive: true, force: true })
  }
}

async function fixtureAsync(
  run: (root: string, script: string) => Promise<void>,
) {
  const root = mkdtempSync(join(tmpdir(), 'cacau-memory-test-'))
  const script = join(root, 'scripts/codex/conversation_memory.py')
  mkdirSync(dirname(script), { recursive: true })
  mkdirSync(join(root, '.git'))
  writeFileSync(join(root, 'AGENTS.md'), '# synthetic fixture\n')
  copyFileSync(sourceScript, script)
  try {
    await run(root, script)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function event(
  root: string,
  turn: string,
  user = 'hello',
  assistant = 'world',
) {
  return JSON.stringify({
    type: 'agent-turn-complete',
    cwd: root,
    'thread-id': 'synthetic-thread',
    'turn-id': turn,
    'input-messages': [
      { role: 'user', content: [{ type: 'text', text: user }] },
    ],
    'last-assistant-message': assistant,
  })
}

function notify(script: string, payload: string) {
  return spawnSync('python3', ['-B', script, 'notify', payload], {
    encoding: 'utf8',
  })
}

test('redaction removes complete synthetic credentials and is idempotent', () => {
  const cases = [
    'Authorization: Bearer synthetic-bearer-value',
    'authorization=Bearer short',
    'Proxy-Authorization: Basic c3ludGhldGlj',
    '{"Authorization": "Bearer synthetic-token", "ok": true}',
    'Cookie: sid=synthetic-one; pref=synthetic-two',
    'Set-Cookie: session=synthetic; HttpOnly; Secure',
    'postgresql://fake-user:fake-password@private.invalid/db?token=fake-query',
    'postgres://fake-user:p%40ss@private.invalid/db',
    'mysql://fake-user:fake-password@private.invalid/db',
    'https://fake-user:fake-password@private.invalid/path',
    'https://public.invalid/path?api_key=fake-query&ok=true',
    'password="synthetic value with spaces"',
    '{"token":"synthetic value"}',
    'SESSION_SECRET=synthetic-session-secret',
    'JWT_SECRET: "synthetic-jwt-secret"',
    'AUTH_TOKEN=synthetic-auth-token',
    'OPENAI_API_KEY=synthetic-openai-key',
    'STRIPE_SECRET_KEY=synthetic-stripe-key',
    'DB_PASSWORD=synthetic-db-password',
    'WORKER-ACCESS-TOKEN=synthetic-worker-token',
    'SERVICE_PRIVATE_KEY=synthetic-private-key',
    'AWS_SECRET_ACCESS_KEY=synthetic-access-key',
    'JWT_SIGNING_KEY=synthetic-signing-key',
    'FIELD_ENCRYPTION_KEY=synthetic-encryption-key',
    'KEY_PASSPHRASE=synthetic-passphrase',
    'APP_CREDENTIALS=synthetic-credentials',
    'REDIS_CONNECTION_STRING=synthetic-connection-string',
    'SENTRY_DSN=synthetic-dsn',
    'SESSION_COOKIE=synthetic-cookie',
    '-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----',
  ]
  const output = execFileSync(
    'python3',
    [
      '-B',
      '-c',
      `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('memory', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
values = json.load(sys.stdin)
print(json.dumps([[module.redact(v), module.redact(module.redact(v))] for v in values]))
`,
      sourceScript,
    ],
    { input: JSON.stringify(cases), encoding: 'utf8' },
  )
  const results = JSON.parse(output) as Array<[string, string]>
  for (const [value, twice] of results) {
    assert.doesNotMatch(
      value,
      /synthetic|fake-user|fake-password|private\.invalid|p%40ss|c3ludGhldGlj|short/,
    )
    assert.match(value, /REDACTED/)
    assert.equal(value, twice)
  }
})

test('redaction matches compound sensitive suffixes without broad key false positives', () => {
  const sensitive = [
    {
      input: 'DATABASE_SECRET=fictional-database-secret-7Yp',
      name: 'DATABASE_SECRET',
      value: 'fictional-database-secret-7Yp',
    },
    {
      input:
        "export AUTH_PROVIDER_TOKEN='fictional auth token !@#$%^&*()[]{};,&=+/?.'",
      name: 'AUTH_PROVIDER_TOKEN',
      value: 'fictional auth token !@#$%^&*()[]{};,&=+/?.',
    },
    {
      input:
        'DB_MASTER_PASSWORD: "fictional db password !@#$%^&*()[]{};,&=+/?."',
      name: 'DB_MASTER_PASSWORD',
      value: 'fictional db password !@#$%^&*()[]{};,&=+/?.',
    },
    {
      input: 'SERVICE_API_KEY=fictional-service-key+/=._:-',
      name: 'SERVICE_API_KEY',
      value: 'fictional-service-key+/=._:-',
    },
    {
      input: '{"OAUTH_CLIENT_SECRET":"fictional-oauth-client-secret"}',
      name: 'OAUTH_CLIENT_SECRET',
      value: 'fictional-oauth-client-secret',
    },
    {
      input: 'export INTEGRATION_ACCESS_TOKEN="fictional-integration-token"',
      name: 'INTEGRATION_ACCESS_TOKEN',
      value: 'fictional-integration-token',
    },
    {
      input: 'database_secret=fictional-lowercase-secret',
      name: 'database_secret',
      value: 'fictional-lowercase-secret',
    },
    {
      input: 'AuTh_PrOvIdEr_ToKeN=fictional-mixed-case-token',
      name: 'AuTh_PrOvIdEr_ToKeN',
      value: 'fictional-mixed-case-token',
    },
  ]
  const preserved = [
    'VITE_TURNSTILE_SITE_KEY=fictional-public-site-key',
    'PRODUCT_SECRETARY=fictional-product-secretary',
  ]
  const output = execFileSync(
    'python3',
    [
      '-B',
      '-c',
      `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('memory', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
values = json.load(sys.stdin)
print(json.dumps([module.redact(value) for value in values]))
`,
      sourceScript,
    ],
    {
      input: JSON.stringify([
        ...sensitive.map(({ input }) => input),
        ...preserved,
      ]),
      encoding: 'utf8',
    },
  )
  const results = JSON.parse(output) as string[]

  for (const [index, { name, value }] of sensitive.entries()) {
    assert.ok(results[index].includes(name))
    assert.match(results[index], /\[REDACTED\]/)
    assert.equal(results[index].includes(value), false)
  }
  assert.deepEqual(results.slice(sensitive.length), preserved)
})

test('notify separates roles, ignores tool payloads, blocks traversal and deduplicates replay', () => {
  fixture((root, script) => {
    const payload = JSON.stringify({
      type: 'agent-turn-complete',
      cwd: root,
      'thread-id': '../../synthetic-thread',
      'turn-id': 'turn-1',
      'input-messages': [
        { role: 'user', content: 'user message' },
        { tool_output: 'raw-tool-output-must-not-be-captured' },
      ],
      'last-assistant-message': 'assistant message',
    })
    assert.equal(notify(script, payload).status, 0)
    assert.equal(notify(script, payload).status, 0)
    const files = readdirSync(join(root, '.codex-local/conversations'))
    assert.deepEqual(files, ['------synthetic-thread.md'])
    const transcript = readFileSync(
      join(root, '.codex-local/conversations', files[0]),
      'utf8',
    )
    assert.equal(transcript.match(/^## Usuário/gm)?.length, 1)
    assert.equal(transcript.match(/^## Codex/gm)?.length, 1)
    assert.match(transcript, /> user message/)
    assert.match(transcript, /> assistant message/)
    assert.match(transcript, /REGISTRO LOCAL NÃO CONFIÁVEL/)
    assert.doesNotMatch(transcript, /raw-tool-output/)
  })
})

test('notify refuses symlinked local state and never writes outside the project', () => {
  fixture((root, script) => {
    const outside = mkdtempSync(join(tmpdir(), 'cacau-memory-outside-'))
    try {
      symlinkSync(outside, join(root, '.codex-local'), 'dir')
      const result = notify(script, event(root, 'turn-1'))
      assert.equal(result.status, 1)
      assert.match(result.stderr, /caminho simbólico recusado/)
      assert.deepEqual(readdirSync(outside), [])
    } finally {
      rmSync(join(root, '.codex-local'), { force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })
})

test('user-level notifier ignores other repositories and a read-only .codex directory', () => {
  fixture((root, script) => {
    const other = mkdtempSync(join(tmpdir(), 'cacau-memory-other-repo-'))
    try {
      mkdirSync(join(other, '.git'))
      writeFileSync(join(other, 'AGENTS.md'), '# other synthetic repo\n')
      assert.equal(notify(script, event(other, 'turn-other')).status, 0)
      assert.equal(existsSync(join(other, '.codex-local')), false)

      mkdirSync(join(root, '.codex'))
      chmodSync(join(root, '.codex'), 0o500)
      assert.equal(notify(script, event(root, 'turn-local')).status, 0)
      assert.equal(
        existsSync(join(root, '.codex-local/context/CURRENT-CONTEXT.md')),
        true,
      )
      chmodSync(join(root, '.codex'), 0o700)
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })
})

test('concurrent notifications are serialized without losing turns', async () => {
  await fixtureAsync(async (root, script) => {
    const runs = Array.from(
      { length: 8 },
      (_, index) =>
        new Promise<void>((resolve, reject) => {
          const child = spawn('python3', [
            '-B',
            script,
            'notify',
            event(root, `turn-${index}`, `user-${index}`, `assistant-${index}`),
          ])
          let stderr = ''
          child.stderr.setEncoding('utf8')
          child.stderr.on('data', (chunk) => (stderr += chunk))
          child.on('error', reject)
          child.on('close', (code) =>
            code === 0
              ? resolve()
              : reject(new Error(`notify ${code}: ${stderr}`)),
          )
        }),
    )
    await Promise.all(runs)
    const transcript = readFileSync(
      join(root, '.codex-local/conversations/synthetic-thread.md'),
      'utf8',
    )
    for (let index = 0; index < 8; index += 1) {
      assert.match(transcript, new RegExp(`> user-${index}\\b`))
      assert.match(transcript, new RegExp(`> assistant-${index}\\b`))
    }
    assert.equal(transcript.match(/^## Usuário/gm)?.length, 8)
    assert.equal(transcript.match(/^## Codex/gm)?.length, 8)
  })
})

test('atomic write preserves prior evidence when replacement is interrupted', () => {
  const output = execFileSync(
    'python3',
    [
      '-B',
      '-c',
      `
import importlib.util, pathlib, sys, tempfile
spec = importlib.util.spec_from_file_location('memory', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as directory:
    target = pathlib.Path(directory) / 'context.md'
    target.write_text('prior evidence', encoding='utf-8')
    original = module.os.replace
    module.os.replace = lambda *_: (_ for _ in ()).throw(OSError('synthetic interruption'))
    try:
        module.atomic_write(target, 'new incomplete evidence')
    except OSError:
        pass
    finally:
        module.os.replace = original
    print(target.read_text(encoding='utf-8'))
`,
      sourceScript,
    ],
    { encoding: 'utf8' },
  )
  assert.equal(output.trim(), 'prior evidence')
})

test('missing directories are created with private permissions and read-only failure is clear', () => {
  fixture((root, script) => {
    assert.equal(notify(script, event(root, 'turn-1')).status, 0)
    const base = join(root, '.codex-local')
    const transcript = join(base, 'conversations/synthetic-thread.md')
    const context = join(base, 'context/CURRENT-CONTEXT.md')
    assert.equal(lstatSync(base).mode & 0o777, 0o700)
    assert.equal(lstatSync(transcript).mode & 0o777, 0o600)
    assert.equal(lstatSync(context).mode & 0o777, 0o600)

    const prior = readFileSync(context, 'utf8')
    chmodSync(join(base, 'context'), 0o500)
    const failed = notify(
      script,
      event(root, 'turn-2', 'next user', 'next assistant'),
    )
    assert.equal(failed.status, 1)
    assert.match(failed.stderr, /memória local do Codex não foi atualizada/)
    assert.equal(readFileSync(context, 'utf8'), prior)
    chmodSync(join(base, 'context'), 0o700)
  })
})

test('large transcripts rotate with bounded local retention', () => {
  fixture((root, script) => {
    const large = 'x'.repeat(90_000)
    for (let index = 0; index < 14; index += 1) {
      const result = notify(
        script,
        event(root, `turn-${index}`, `${large}-${index}`, 'ok'),
      )
      assert.equal(result.status, 0)
    }
    const archives = readdirSync(join(root, '.codex-local/archive'))
    assert.ok(archives.length > 0)
    assert.ok(archives.length <= 10)
    const current = readFileSync(
      join(root, '.codex-local/conversations/synthetic-thread.md'),
      'utf8',
    )
    assert.ok(current.length <= 240_000)
  })
})

test('finalize keeps bounded private Git snapshots and a context index', () => {
  fixture((root, script) => {
    rmSync(join(root, '.git'), { recursive: true, force: true })
    execFileSync('git', ['init', '-q', '-b', 'fixture'], { cwd: root })
    execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], {
      cwd: root,
    })
    execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root })
    writeFileSync(join(root, 'safe.txt'), 'synthetic fixture\n')
    execFileSync('git', ['add', 'AGENTS.md', 'safe.txt'], { cwd: root })
    execFileSync('git', ['commit', '-qm', 'synthetic fixture'], { cwd: root })

    assert.equal(notify(script, event(root, 'turn-1')).status, 0)
    for (let index = 0; index < 25; index += 1) {
      const result = spawnSync('python3', ['-B', script, 'finalize'], {
        cwd: root,
        encoding: 'utf8',
      })
      assert.equal(result.status, 0, result.stderr)
    }

    const base = join(root, '.codex-local')
    const snapshots = readdirSync(join(base, 'history'))
    assert.equal(snapshots.length, 20)
    for (const snapshot of snapshots) {
      const path = join(base, 'history', snapshot)
      assert.equal(lstatSync(path).mode & 0o777, 0o600)
      assert.match(readFileSync(path, 'utf8'), /Registro local não confiável/)
    }
    const indexPath = join(base, 'context/CONTEXT-INDEX.md')
    const index = readFileSync(indexPath, 'utf8')
    assert.equal(index.match(/^- /gm)?.length, 25)
    assert.equal(lstatSync(indexPath).mode & 0o777, 0o600)
    assert.match(
      readFileSync(join(base, 'context/CURRENT-CONTEXT.md'), 'utf8'),
      /Snapshot Git: `history\//,
    )
    assert.equal(lstatSync(join(base, 'terminal/sessions')).mode & 0o777, 0o700)
    assert.equal(lstatSync(join(base, 'autonomy')).mode & 0o777, 0o700)
  })
})

test('prepare refuses a symlinked terminal directory', () => {
  fixture((root, script) => {
    const outside = mkdtempSync(join(tmpdir(), 'cacau-terminal-outside-'))
    try {
      mkdirSync(join(root, '.codex-local'), { mode: 0o700 })
      symlinkSync(outside, join(root, '.codex-local/terminal'), 'dir')
      const result = spawnSync('python3', ['-B', script, 'prepare'], {
        cwd: root,
        encoding: 'utf8',
      })
      assert.equal(result.status, 1)
      assert.match(result.stderr, /caminho simbólico recusado/)
      assert.deepEqual(readdirSync(outside), [])
    } finally {
      rmSync(join(root, '.codex-local/terminal'), { force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })
})
