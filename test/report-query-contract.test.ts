import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { isMissingOptionalSchemaError } from '../src/features/reports/optional-schema'

test('relatório FIFO mantém camadas de compra e ajuste sem saída de produção', async () => {
  const source = await readFile(
    new URL('../src/features/reports/functions.ts', import.meta.url),
    'utf8',
  )
  const outputJoin = source.indexOf(
    '.leftJoin(\n            productionBatchOutputs',
  )

  assert.notEqual(outputJoin, -1)
})

test('somente ausência de schema opcional pode desativar seção do relatório', () => {
  assert.equal(isMissingOptionalSchemaError({ code: '42P01' }), true)
  assert.equal(isMissingOptionalSchemaError({ code: '42703' }), true)
  assert.equal(isMissingOptionalSchemaError({ code: '08006' }), false)
  assert.equal(
    isMissingOptionalSchemaError(new Error('consulta falhou')),
    false,
  )
})
