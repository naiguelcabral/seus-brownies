import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const script = new URL(
  '../scripts/codex/record_terminal_session.sh',
  import.meta.url,
)

test('captura de terminal usa a infraestrutura endurecida e permanece separada', async () => {
  const source = await readFile(script, 'utf8')

  assert.match(source, /python3 "\$MEMORY_SCRIPT" prepare/)
  assert.match(source, /-L "\$LOG_DIR"/)
  assert.match(source, /mktemp "\$LOG_DIR\//)
  assert.match(source, /chmod 600 "\$LOG_FILE"/)
  assert.match(source, /não confiável/)
  assert.match(source, /nunca é carregado automaticamente/)
  assert.doesNotMatch(source, /mkdir -p/)
})
