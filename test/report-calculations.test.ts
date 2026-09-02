import assert from 'node:assert/strict'
import test from 'node:test'

import {
  groupExpensesByCategory,
  groupRevenueByChannel,
  groupSalesByProduct,
  summarizeFifoMargins,
  sumReportMoney,
  summarizeLifecycleFinancials,
  valueFifoLayers,
  valueInventory,
} from '../src/features/reports/calculations'

test('agrega faturamento preservando valores históricos por canal', () => {
  const result = groupRevenueByChannel([
    { channel: 'Feira', amount: '10.25' },
    { channel: 'Feira', amount: '2.75' },
    { channel: 'Sem canal', amount: '5.00' },
  ])
  assert.deepEqual(result, [
    { channel: 'Feira', total: '13.00' },
    { channel: 'Sem canal', total: '5.00' },
  ])
})

test('separa receita líquida, CMV, perdas, margem e resultado financeiro', () => {
  assert.deepEqual(
    summarizeLifecycleFinancials({
      grossRevenue: ['24.00'],
      returnCredits: ['4.00'],
      cogs: ['7.56'],
      losses: ['1.20'],
      expenses: ['3.00'],
    }),
    {
      grossRevenue: '24.00',
      returns: '4.00',
      netRevenue: '20.00',
      cogs: '7.56',
      losses: '1.20',
      grossMargin: '11.24',
      simpleFinancialResult: '17.00',
    },
  )
})

test('agrega despesas e valoriza estoque com custo médio', () => {
  assert.deepEqual(
    groupExpensesByCategory([
      { category: 'Insumos', amount: '20.00' },
      { category: 'Insumos', amount: '5.50' },
    ]),
    [{ category: 'Insumos', total: '25.50' }],
  )
  assert.equal(
    sumReportMoney([{ amount: '20.00' }, { amount: '5.50' }]),
    '25.50',
  )
  const [inventory] = valueInventory([
    {
      productId: 1,
      productName: 'Chocolate',
      unit: 'g',
      quantityDelta: '100.000',
      unitCost: '0.02',
    },
    {
      productId: 1,
      productName: 'Chocolate',
      unit: 'g',
      quantityDelta: '-25.000',
      unitCost: null,
    },
  ])
  assert.equal(inventory.balance, '75.000')
  assert.equal(inventory.value, '1.50')
})

test('agrega vendas por produto sem substituir o preço histórico', () => {
  assert.deepEqual(
    groupSalesByProduct([
      { productName: 'Brownie', quantity: '1', amount: '4.50' },
      { productName: 'Brownie', quantity: '2', amount: '9.00' },
    ]),
    [{ productName: 'Brownie', quantity: '3.000', amount: '13.50' }],
  )
})

test('valoriza saídas de produção pelo custo total alocado, não por custo unitário arredondado', () => {
  const inventory = valueInventory([
    {
      productId: 3,
      productName: 'Brownie Recheado',
      unit: 'unit',
      quantityDelta: '12.000',
      unitCost: '3.778',
      allocatedCost: '45.33',
    },
    {
      productId: 2,
      productName: 'Bordinhas',
      unit: 'unit',
      quantityDelta: '6.000',
      unitCost: '3.778',
      allocatedCost: '22.67',
    },
  ])
  assert.equal(
    sumReportMoney(inventory.map((item) => ({ amount: item.value }))),
    '68.00',
  )
  assert.deepEqual(
    inventory.map((item) => item.value),
    ['45.33', '22.67'],
  )
})

test('calcula CMV e margem bruta FIFO sem somar a receita duas vezes', () => {
  const margin = summarizeFifoMargins([
    {
      allocationId: 1,
      saleItemId: 1,
      productId: 3,
      productName: 'Brownie Recheado',
      productionBatchId: 18,
      quantity: '1.000',
      allocatedCost: '3.78',
      saleItemRevenue: '12.00',
    },
    {
      allocationId: 2,
      saleItemId: 2,
      productId: 3,
      productName: 'Brownie Recheado',
      productionBatchId: 18,
      quantity: '1.000',
      allocatedCost: '3.78',
      saleItemRevenue: '12.00',
    },
  ])
  assert.equal(margin.netRevenue, '24.00')
  assert.equal(margin.cogs, '7.56')
  assert.equal(margin.grossMargin, '16.44')
  assert.deepEqual(margin.byProduct, [
    {
      productName: 'Brownie Recheado',
      revenue: '24.00',
      cogs: '7.56',
      grossMargin: '16.44',
    },
  ])
  assert.equal(margin.byBatch[0]?.grossMargin, '16.44')
})

test('mantém o CMV integral quando não há reversão FIFO', () => {
  const margin = summarizeFifoMargins([{
    allocationId: 1, saleItemId: 1, productId: 3, productName: 'Brownie',
    productionBatchId: 18, quantity: '1.000', allocatedCost: '3.78',
    reversedCost: '0.00', saleItemRevenue: '12.00',
  }])
  assert.equal(margin.netRevenue, '12.00')
  assert.equal(margin.cogs, '3.78')
  assert.equal(margin.grossMargin, '8.22')
})

test('abate do CMV somente o custo restaurado em devolução parcial', () => {
  const margin = summarizeFifoMargins([{
    allocationId: 1, saleItemId: 1, productId: 3, productName: 'Brownie',
    productionBatchId: 18, quantity: '2.000', allocatedCost: '7.56',
    reversedCost: '3.78', saleItemRevenue: '24.00',
  }])
  assert.equal(margin.netRevenue, '24.00')
  assert.equal(margin.cogs, '3.78')
  assert.equal(margin.grossMargin, '20.22')
})

test('zera CMV após devolução total sem decidir efeito sobre receita', () => {
  const margin = summarizeFifoMargins([{
    allocationId: 1, saleItemId: 1, productId: 3, productName: 'Brownie',
    productionBatchId: 18, quantity: '1.000', allocatedCost: '3.78',
    reversedCost: '3.78', saleItemRevenue: '12.00',
  }])
  assert.equal(margin.netRevenue, '12.00')
  assert.equal(margin.cogs, '0.00')
  assert.equal(margin.grossMargin, '12.00')
})

test('zera CMV da alocação revertida em cancelamento sem alterar receita no cálculo FIFO', () => {
  const margin = summarizeFifoMargins([{
    allocationId: 1, saleItemId: 1, productId: 3, productName: 'Brownie',
    productionBatchId: 18, quantity: '1.000', allocatedCost: '3.78',
    reversedCost: '3.78', saleItemRevenue: '12.00',
  }])
  assert.equal(margin.netRevenue, '12.00')
  assert.equal(margin.cogs, '0.00')
})

test('valoriza estoque FIFO pelas camadas remanescentes e não por custo médio', () => {
  assert.deepEqual(
    valueFifoLayers([
      {
        productId: 3,
        productName: 'Brownie Recheado',
        unit: 'unit',
        remainingQuantity: '10.000',
        remainingCost: '37.77',
      },
    ]),
    [
      {
        productId: 3,
        productName: 'Brownie Recheado',
        unit: 'unit',
        balance: '10.000',
        value: '37.77',
      },
    ],
  )
})
