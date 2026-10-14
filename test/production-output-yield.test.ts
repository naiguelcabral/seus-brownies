import assert from 'node:assert/strict'
import test from 'node:test'
import { compareOutputYield } from '../src/features/production/output-yield'

test('rendimento compara fatos físicos sem ponto flutuante', () => {
  assert.deepEqual(
    compareOutputYield('9007199254740993.125', '9007199254740993.124'),
    {
      planned: '9007199254740993.125',
      actual: '9007199254740993.124',
      difference: '-0.001',
    },
  )
  assert.equal(compareOutputYield('1.000', '1.125').difference, '0.125')
})

test('rendimento ausente não é substituído pelo planejado ou zero', () => {
  assert.deepEqual(compareOutputYield('1.000', null), {
    planned: '1.000',
    actual: null,
    difference: null,
  })
  assert.deepEqual(compareOutputYield(null, '0.000'), {
    planned: null,
    actual: '0.000',
    difference: null,
  })
  assert.deepEqual(compareOutputYield(null, null), {
    planned: null,
    actual: null,
    difference: null,
  })
})

test('zero realizado é um fato e precisão inválida falha explicitamente', () => {
  assert.equal(compareOutputYield('1.000', '0.000').difference, '-1.000')
  assert.throws(
    () => compareOutputYield('1.0001', '1'),
    /Quantidade de saída inválida/,
  )
  assert.throws(
    () => compareOutputYield('1', 'inválido'),
    /Quantidade de saída inválida/,
  )
})
