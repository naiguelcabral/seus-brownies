import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
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
  return spawnSync('python3', [guard, mode], { cwd: root }).status
}

test('guard blocks new, staged and tracked sensitive paths, including nested/newline names', () => {
  for (const path of [
    '.env.production',
    'nested/.env.preview',
    'new\nline/.env',
    '.dev.vars.hml',
    'nested/private.pem',
    '.codex-local/conversations/a.md',
    '.env.production.example',
  ]) {
    fixture((root, git) => {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), 'FICTIONAL=synthetic')
      assert.equal(status(root), 1, path)
      git('add', '--', path)
      assert.equal(status(root, 'staged'), 1, path)
      git('commit', '-m', 'synthetic sensitive fixture')
      assert.equal(status(root), 1, path)
      assert.equal(status(root, 'head'), 1, path)
    })
  }
})
test('guard blocks rename destinations and permits only the explicit root example', () => {
  fixture((root, git) => {
    writeFileSync(join(root, '.env.example'), 'FAKE=example')
    git('add', '.env.example')
    assert.equal(status(root), 0)
    assert.equal(status(root, 'staged'), 0)
    git('mv', 'safe.txt', '.env.renamed')
    assert.equal(status(root, 'staged'), 1)
  })
})
test('ignored sensitive files stay outside candidates but forced staging is rejected', () => {
  fixture((root, git) => {
    writeFileSync(join(root, '.gitignore'), '.env*\n')
    writeFileSync(join(root, '.env.production'), 'FAKE=example')
    assert.equal(status(root), 0)
    git('add', '-f', '.env.production')
    assert.equal(status(root, 'staged'), 1)
  })
})
