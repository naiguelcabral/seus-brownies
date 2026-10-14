import assert from 'node:assert/strict'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const setup = join(root, 'scripts/codex/setup-github-mcp-credential.sh')
const launcher = join(root, 'scripts/codex/start-codex.sh')

async function withFakeCommands(
  run: (path: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'github-mcp-auth-test-'))
  try {
    const secretTool = join(dir, 'secret-tool')
    const codex = join(dir, 'codex')
    await writeFile(
      secretTool,
      `#!/usr/bin/env bash
case "$1" in
  lookup)
    [[ "$*" == "lookup service seus-brownies-codex account github-mcp key github-pat" ]] || exit 4
    case "$MOCK_KEYRING_STATE" in
      ready) printf 'fixture-token' ;;
      empty) printf '\\n' ;;
      *) exit 1 ;;
    esac
    ;;
  store)
    IFS= read -r secret || true
    [[ "$secret" == "fixture-token" ]] || exit 4
    ;;
  *) exit 4 ;;
esac
`,
    )
    await writeFile(
      codex,
      `#!/usr/bin/env bash
if [[ "$1" == mcp && "$2" == get && "$3" == github && "$4" == --json ]]; then
  [[ -z "$GITHUB_PAT_TOKEN" ]] || exit 6
  if [[ "$MOCK_MCP_STATE" == bad ]]; then
    printf '%s\\n' '{"name":"github","enabled":true,"transport":{"type":"streamable_http","bearer_token_env_var":"WRONG"}}'
  else
    printf '%s\\n' '{"name":"github","enabled":true,"transport":{"type":"streamable_http","bearer_token_env_var":"GITHUB_PAT_TOKEN"}}'
  fi
else
  [[ "$GITHUB_PAT_TOKEN" == "fixture-token" ]] || exit 5
  printf 'CHILD_HAS_TOKEN=YES\\nCHILD_CWD=%s\\n' "$PWD"
fi
`,
    )
    await chmod(secretTool, 0o755)
    await chmod(codex, 0o755)
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function runScript(
  script: string,
  path: string,
  args: string[],
  extraEnv: Record<string, string> = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MOCK_KEYRING_STATE: 'ready',
    MOCK_MCP_STATE: 'ready',
    ...extraEnv,
    PATH: `${path}:${process.env.PATH}`,
  }
  if (!Object.hasOwn(extraEnv, 'GITHUB_PAT_TOKEN')) {
    delete env.GITHUB_PAT_TOKEN
  }
  return spawnSync(script, args, { cwd: root, env, encoding: 'utf8' })
}

test('setup verifica sem revelar o valor e falha quando o keyring não responde', async () => {
  await withFakeCommands(async (path) => {
    const ready = runScript(setup, path, ['--check'])
    assert.equal(ready.status, 0)
    assert.doesNotMatch(ready.stdout + ready.stderr, /fixture-token/)

    const missing = runScript(setup, path, ['--check'], {
      MOCK_KEYRING_STATE: 'missing',
    })
    assert.equal(missing.status, 1)
    assert.doesNotMatch(missing.stdout + missing.stderr, /fixture-token/)

    const stored = runScript(setup, path, [], {
      GITHUB_PAT_TOKEN: 'fixture-token',
    })
    assert.equal(stored.status, 0)
    assert.doesNotMatch(stored.stdout + stored.stderr, /fixture-token/)

    const emptyInput = runScript(setup, path, [], { GITHUB_PAT_TOKEN: '' })
    assert.equal(emptyInput.status, 1)
  })
})

test('launcher carrega o keyring sem export prévio e rejeita vazio/configuração incorreta', async () => {
  await withFakeCommands(async (path) => {
    const check = runScript(launcher, path, ['--check'])
    assert.equal(check.status, 0)
    assert.match(check.stdout, /GITHUB_PERSISTENCE_READY=YES/)
    assert.doesNotMatch(check.stdout + check.stderr, /fixture-token/)

    const launched = runScript(launcher, path, [])
    assert.equal(launched.status, 0)
    assert.match(launched.stdout, /CHILD_HAS_TOKEN=YES/)
    assert.match(launched.stdout, new RegExp(`CHILD_CWD=${root}`))
    assert.doesNotMatch(launched.stdout + launched.stderr, /fixture-token/)

    const inherited = runScript(launcher, path, [], {
      GITHUB_PAT_TOKEN: 'stale-value',
    })
    assert.equal(inherited.status, 0)
    assert.match(inherited.stdout, /CHILD_HAS_TOKEN=YES/)

    const empty = runScript(launcher, path, [], { MOCK_KEYRING_STATE: 'empty' })
    assert.equal(empty.status, 1)

    const invalid = runScript(launcher, path, ['--check'], {
      MOCK_MCP_STATE: 'bad',
    })
    assert.equal(invalid.status, 1)
    assert.doesNotMatch(invalid.stdout + invalid.stderr, /fixture-token/)
  })
})
