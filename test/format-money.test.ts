import assert from 'node:assert/strict'
import test from 'node:test'

import { formatBrlMoney } from '../src/lib/format-money'

test('formata centavos em reais sem perder precisão fora do inteiro seguro', () => {
  assert.equal(
    formatBrlMoney('12345678901234567890.12'),
    'R$ 12.345.678.901.234.567.890,12',
  )
  assert.equal(formatBrlMoney('-0.50'), '-R$ 0,50')
  assert.equal(formatBrlMoney('10'), 'R$ 10,00')
  assert.equal(formatBrlMoney('-0.00'), 'R$ 0,00')
})

test('rejeita representação monetária fora do contrato do servidor', () => {
  assert.throws(() => formatBrlMoney('1.234'), /Valor monetário inválido/)
  assert.throws(() => formatBrlMoney('R$ 10,00'), /Valor monetário inválido/)
})
