import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const guard = fileURLToPath(
  new URL('../scripts/git-sensitive-paths.py', import.meta.url),
)

function fixture(
  run: (root: string, git: (...args: string[]) => void) => void,
) {
  const root = mkdtempSync(join(tmpdir(), 'cacau-path-test-'))
  const git = (...args: string[]) => {
    execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  }
  try {
    git('init', '-b', 'fixture')
    git('config', 'user.email', 'fixture@example.invalid')
    git('config', 'user.name', 'Fixture')
    writeFileSync(join(root, 'safe.txt'), 'synthetic')
    git('add', 'safe.txt')
    git('commit', '-m', 'fixture')
    run(root, git)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function status(root: string, mode = 'preflight') {
  return spawnSync('python3', ['-B', guard, mode], { cwd: root }).status
}

function staged(root: string) {
  return execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
    cwd: root,
  })
}

test('guard rejects nested, staged and tracked sensitive paths without changing staging', () => {
  for (const path of [
    '.env.production',
    '.env.production.example',
    'nested/.env.preview',
    'new\nline/.env',
    '.dev.vars.hml',
    'nested/private.pem',
    '.codex-local/conversations/a.md',
    '.codex/config.toml',
  ]) {
    fixture((root, git) => {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), 'FICTIONAL=synthetic')
      assert.equal(status(root), 1, path)
      git('add', '--', path)
      const before = staged(root)
      assert.equal(status(root, 'staged'), 1, path)
      assert.deepEqual(staged(root), before)
      git('commit', '-m', 'synthetic sensitive fixture')
      assert.equal(status(root, 'head'), 1, path)
    })
  }
})

test('guard rejects a sensitive rename destination without changing staging', () => {
  fixture((root, git) => {
    git('mv', 'safe.txt', '.env.renamed')
    const before = staged(root)
    assert.equal(status(root, 'staged'), 1)
    assert.deepEqual(staged(root), before)
  })
})

test('guard permits only the explicit root env example', () => {
  fixture((root, git) => {
    writeFileSync(join(root, '.env.example'), 'FAKE=example')
    git('add', '.env.example')
    assert.equal(status(root), 0)
    assert.equal(status(root, 'staged'), 0)
  })
})

test('ignored sensitive files stay untracked while forced staging is rejected', () => {
  fixture((root, git) => {
    writeFileSync(join(root, '.gitignore'), '.env*\n.codex-local/\n')
    writeFileSync(join(root, '.env.production'), 'FAKE=example')
    mkdirSync(join(root, '.codex-local'))
    writeFileSync(join(root, '.codex-local', 'memory.md'), 'synthetic')
    assert.equal(status(root), 0)
    git('add', '-f', '.env.production')
    assert.equal(status(root, 'staged'), 1)
  })
})
