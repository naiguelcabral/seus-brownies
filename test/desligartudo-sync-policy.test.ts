import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readScript() {
  return readFile(new URL('../DESLIGARTUDO', import.meta.url), 'utf8')
}

test('branch remota existente faz rebase antes de push sem force', async () => {
  const script = await readScript()

  assert.match(script, /git ls-remote --exit-code --heads origin "\$BRANCH"/)
  assert.match(script, /REMOTE_BRANCH_STATUS" -eq 0/)
  assert.match(script, /git pull --rebase origin "\$BRANCH"/)
  assert.match(script, /git push origin "\$BRANCH"/)
  assert.doesNotMatch(script, /git push --force|git push -f/)
})

test('primeira publicação não executa pull e cria upstream', async () => {
  const script = await readScript()
  const firstPublish = script.indexOf('REMOTE_BRANCH_STATUS" -eq 2')

  assert.notEqual(firstPublish, -1)
  assert.match(script.slice(firstPublish), /git push -u origin "\$BRANCH"/)
  assert.doesNotMatch(
    script.slice(firstPublish),
    /git pull --rebase origin "\$BRANCH"/,
  )
})

test('bloqueia caminhos sensíveis antes da memória e antes do commit', async () => {
  const script = await readScript()
  const preflight = script.indexOf('git-sensitive-paths.py" preflight')
  const finalize = script.indexOf('conversation_memory.py" finalize')
  const gitAdd = script.indexOf('git add --all')
  const stagedChecks = [...script.matchAll(/git-sensitive-paths\.py" staged/g)]

  assert.ok(preflight >= 0 && preflight < finalize)
  assert.equal(stagedChecks.length, 2)
  assert.ok(stagedChecks[0].index < finalize)
  assert.ok(stagedChecks[1].index > gitAdd)
  assert.match(script, /git check-ignore -q \.codex-local\//)
})
