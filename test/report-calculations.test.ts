import assert from 'node:assert/strict'
import test from 'node:test'

import { groupExpensesByCategory, groupRevenueByChannel, groupSalesByProduct, sumReportMoney, valueInventory } from '../src/features/reports/calculations'

test('agrega faturamento preservando valores históricos por canal', () => {
  const result = groupRevenueByChannel([
    { channel: 'Feira', amount: '10.25' },
    { channel: 'Feira', amount: '2.75' },
    { channel: 'Sem canal', amount: '5.00' },
  ])
  assert.deepEqual(result, [{ channel: 'Feira', total: '13.00' }, { channel: 'Sem canal', total: '5.00' }])
})

test('agrega despesas e valoriza estoque com custo médio', () => {
  assert.deepEqual(groupExpensesByCategory([{ category: 'Insumos', amount: '20.00' }, { category: 'Insumos', amount: '5.50' }]), [{ category: 'Insumos', total: '25.50' }])
  assert.equal(sumReportMoney([{ amount: '20.00' }, { amount: '5.50' }]), '25.50')
  const [inventory] = valueInventory([
    { productId: 1, productName: 'Chocolate', unit: 'g', quantityDelta: '100.000', unitCost: '0.02' },
    { productId: 1, productName: 'Chocolate', unit: 'g', quantityDelta: '-25.000', unitCost: null },
  ])
  assert.equal(inventory.balance, '75.000')
  assert.equal(inventory.value, '1.50')
})

test('agrega vendas por produto sem substituir o preço histórico', () => {
  assert.deepEqual(groupSalesByProduct([
    { productName: 'Brownie', quantity: '1', amount: '4.50' },
    { productName: 'Brownie', quantity: '2', amount: '9.00' },
  ]), [{ productName: 'Brownie', quantity: '3.000', amount: '13.50' }])
})
