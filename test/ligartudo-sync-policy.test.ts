import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readScript() {
  return readFile(new URL('../LIGARTUDO', import.meta.url), 'utf8')
}

test('branch remota existente, com árvore limpa, atualiza somente por fast-forward', async () => {
  const script = await readScript()

  assert.match(script, /git ls-remote --exit-code --heads origin "\$BRANCH"/)
  assert.match(script, /REMOTE_BRANCH_STATUS" -eq 0/)
  assert.match(script, /git pull --ff-only origin "\$BRANCH"/)
  assert.doesNotMatch(
    script,
    /git reset|git rebase|git push --force|git push -f/,
  )
})

test('branch local não publicada não tenta pull e segue com estado local', async () => {
  const script = await readScript()
  const unpublished = script.indexOf('REMOTE_BRANCH_STATUS" -eq 2')

  assert.notEqual(unpublished, -1)
  assert.match(script.slice(unpublished), /ainda não foi publicada em origin/)
  assert.doesNotMatch(script.slice(unpublished), /git pull --ff-only/)
})

test('working tree suja adia atualização antes da consulta ao remoto', async () => {
  const script = await readScript()
  const dirtyTree = script.indexOf('git status --porcelain')
  const remoteCheck = script.indexOf('git ls-remote --exit-code --heads')

  assert.notEqual(dirtyTree, -1)
  assert.notEqual(remoteCheck, -1)
  assert.ok(dirtyTree < remoteCheck)
  assert.match(
    script,
    /Há alterações locais\."\n\s*echo "A atualização do GitHub foi adiada/,
  )
})

test('não abre configuração do VS Code e inicia o runtime HML', async () => {
  const script = await readScript()

  assert.doesNotMatch(script, /\bcode\s+.*\.vscode\/mcp\.json/)
  assert.match(script, /codex mcp list 2>\/dev\/null/)
  assert.match(script, /exec npm run dev:hml/)
})

test('prepara somente o contexto local e não instala configuração global', async () => {
  const script = await readScript()

  assert.match(script, /conversation_memory\.py" prepare/)
  assert.match(script, /Captura automática exige configuração local do usuário/)
  assert.doesNotMatch(script, /\.codex\/config\.toml|CODEX_HOME/)
})
