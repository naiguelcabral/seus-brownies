import assert from 'node:assert/strict'
import test from 'node:test'

import { assertProductStructureChangeAllowed } from '../src/features/catalog/product-structure'

const current = { type: 'ingredient' as const, unit: 'kg' as const }

test('produto usado preserva tipo e unidade estruturais', () => {
  assert.throws(
    () =>
      assertProductStructureChangeAllowed(
        current,
        { type: 'packaging', unit: 'kg' },
        true,
      ),
    /não podem ser alterados/,
  )
  assert.throws(
    () =>
      assertProductStructureChangeAllowed(
        current,
        { type: 'ingredient', unit: 'g' },
        true,
      ),
    /não podem ser alterados/,
  )
})

test('produto usado ainda permite alterar atributos não estruturais', () => {
  assert.doesNotThrow(() =>
    assertProductStructureChangeAllowed(current, current, true),
  )
})

test('produto sem uso permite corrigir tipo e unidade', () => {
  assert.doesNotThrow(() =>
    assertProductStructureChangeAllowed(
      current,
      { type: 'packaging', unit: 'unit' },
      false,
    ),
  )
})
