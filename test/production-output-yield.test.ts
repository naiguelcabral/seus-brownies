import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareOutputYield,
  formatOutputYield,
} from '../src/features/production/output-yield'

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

test('auditoria apresenta 24.000 como 24 unidades e preserva ausência de produção', () => {
  assert.deepEqual(formatOutputYield('24.000', null, 'unit'), {
    planned: '24 un.',
    actual: null,
    difference: null,
  })
  assert.deepEqual(formatOutputYield('24000.000', '23999.000', 'unit'), {
    planned: '24.000 un.',
    actual: '23.999 un.',
    difference: '-1 un.',
  })
})

test('apresentação mantém frações, diferenças negativas e inteiros acima de Number sem arredondar', () => {
  assert.deepEqual(formatOutputYield('0.800', '0.799', 'm'), {
    planned: '0,8 m',
    actual: '0,799 m',
    difference: '-0,001 m',
  })
  assert.deepEqual(
    formatOutputYield('9007199254740993.125', '9007199254740993.124', 'g'),
    {
      planned: '9.007.199.254.740.993,125 g',
      actual: '9.007.199.254.740.993,124 g',
      difference: '-0,001 g',
    },
  )
  assert.deepEqual(formatOutputYield(null, '0', ''), {
    planned: null,
    actual: '0',
    difference: null,
  })
})
