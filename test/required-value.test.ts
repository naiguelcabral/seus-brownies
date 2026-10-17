import assert from 'node:assert/strict'
import test from 'node:test'
import { requireDefined, requireFirst } from '../src/lib/required-value'

test('required values reject missing results without replacing valid falsy values', () => {
  assert.throws(
    () => requireDefined(undefined),
    /Resultado obrigatório ausente/,
  )
  assert.throws(() => requireFirst([]), /Resultado obrigatório ausente/)
  assert.equal(requireDefined(0n), 0n)
  assert.equal(requireDefined(false), false)
  assert.equal(requireDefined(null), null)
  assert.equal(requireFirst(['first', 'second']), 'first')
})
