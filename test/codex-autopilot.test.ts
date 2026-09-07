import assert from 'node:assert/strict'
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const root = new URL('..', import.meta.url).pathname
const script = join(root, 'scripts/codex-autopilot.sh')

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'cacau-autopilot-'))
  await mkdir(join(dir, 'docs/governance'), { recursive: true })
  await mkdir(join(dir, '.codex'), { recursive: true })
  await writeFile(
    join(dir, 'docs/governance/AUTONOMY-QUEUE.md'),
    '| ID | Pacote | Estado | Saída |\n| --- | --- | --- | --- |\n| A01 | seguro | ready | teste |\n',
  )
  await writeFile(
    join(dir, 'docs/governance/AUTONOMY-HANDOFF.md'),
    '# handoff\n',
  )
  await writeFile(join(dir, 'docs/governance/AUTONOMY-LOG.md'), '# log\n')
  await writeFile(join(dir, '.gitignore'), 'bin/\nstate/\n')
  await writeFile(join(dir, '.env.example'), 'EXAMPLE_ONLY=true\n')
  await execFileAsync('git', ['init', '-q', '-b', 'autonomy-test'], {
    cwd: dir,
  })
  await execFileAsync('git', ['config', 'user.email', 'test@example.invalid'], {
    cwd: dir,
  })
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '-qm', 'fixture'], { cwd: dir })
  return dir
}

async function run(dir: string, args: string[], codex?: string) {
  const bin = join(dir, 'bin')
  await mkdir(bin, { recursive: true })
  if (codex) {
    const mock = join(bin, 'codex')
    await writeFile(mock, codex)
    await chmod(mock, 0o755)
  }
  return execFileAsync('bash', [script, ...args], {
    cwd: dir,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CODEX_AUTOPILOT_ROOT_DIR: dir,
      CODEX_AUTOPILOT_STATE_DIR: join(dir, 'state'),
    },
  })
}

test('dry-run seleciona apenas o primeiro pacote ready sem chamar Codex', async () => {
  const dir = await fixture()
  try {
    const { stdout } = await run(dir, ['--dry-run'])
    assert.match(stdout, /Pacote selecionado: A01/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('estado bruto usa diretório local ignorado e preserva a sentinela em .codex', async () => {
  const source = await readFile(script, 'utf8')

  assert.match(source, /\.codex-local\/autonomy/)
  assert.match(source, /\.codex\/STOP_AUTONOMY/)
  assert.match(source, /não foi possível criar a trava do controlador/)
})

test('arquivo .env.example versionado não é tratado como segredo', async () => {
  const dir = await fixture()
  try {
    await run(dir, ['--dry-run'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('arquivo .env.local versionado bloqueia o preflight', async () => {
  const dir = await fixture()
  try {
    await writeFile(join(dir, '.env.local'), 'SHOULD_NOT_BE_READ=true\n')
    await execFileAsync('git', ['add', '.env.local'], { cwd: dir })
    await execFileAsync('git', ['commit', '-qm', 'tracked env'], { cwd: dir })
    await assert.rejects(
      run(dir, ['--dry-run']),
      (error: { code?: number }) => error.code === 23,
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('once grava JSONL local e traduz resultado done', async () => {
  const dir = await fixture()
  try {
    await run(
      dir,
      ['--once'],
      '#!/usr/bin/env bash\necho "AUTONOMY_RESULT: done"\n',
    )
    const log = await readFile(
      join(dir, 'docs/governance/AUTONOMY-LOG.md'),
      'utf8',
    )
    assert.match(log, /\| A01 \| done \|/)
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
      cwd: dir,
    })
    assert.equal(stdout, '')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('sentinela impede chamar Codex', async () => {
  const dir = await fixture()
  try {
    await writeFile(join(dir, '.codex/STOP_AUTONOMY'), '')
    await assert.rejects(
      run(dir, ['--once'], '#!/usr/bin/env bash\nexit 99\n'),
      (error: { code?: number }) => error.code === 24,
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('main e lock impedem o ciclo antes de chamar Codex', async () => {
  const dir = await fixture()
  try {
    await execFileAsync('git', ['branch', '-M', 'main'], { cwd: dir })
    await assert.rejects(
      run(dir, ['--once'], '#!/usr/bin/env bash\nexit 99\n'),
      (error: { code?: number }) => error.code === 23,
    )
    await execFileAsync('git', ['branch', '-M', 'autonomy-test'], { cwd: dir })
    await mkdir(join(dir, 'state/autopilot.lock'), { recursive: true })
    await assert.rejects(
      run(dir, ['--once'], '#!/usr/bin/env bash\nexit 99\n'),
      (error: { code?: number }) => error.code === 24,
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('resultado de validação vermelho interrompe com código específico', async () => {
  const dir = await fixture()
  try {
    await assert.rejects(
      run(
        dir,
        ['--once'],
        '#!/usr/bin/env bash\necho "AUTONOMY_RESULT: validation-failed"\n',
      ),
      (error: { code?: number }) => error.code === 21,
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
