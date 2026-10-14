import assert from 'node:assert/strict'
import test from 'node:test'
import { diagnoseDeliveryFifoCoverage } from '../src/features/finance/delivery-fifo-coverage'

const event = { type: 'sale_revenue', saleId: 1 }
const item = { id: 11, saleId: 1, quantity: '3.000' }
const allocation = { id: 21, saleItemId: 11, quantity: '3.000' }

test('cobertura exige alocações completas e aceita múltiplas origens FIFO', () => {
  const result = diagnoseDeliveryFifoCoverage({
    events: [event],
    saleItems: [item],
    allocations: [
      { ...allocation, quantity: '1.001' },
      { ...allocation, id: 22, quantity: '1.999' },
    ],
  })
  assert.equal(result.complete, true)
  assert.equal(result.checkedItems, 1)
  assert.deepEqual(result.divergences, [])
})

test('entrega sem item ou sem FIFO é diagnóstico explícito, não custo zero comprovado', () => {
  assert.equal(
    diagnoseDeliveryFifoCoverage({
      events: [event],
      saleItems: [],
      allocations: [],
    }).divergences[0].code,
    'missing_items',
  )
  const result = diagnoseDeliveryFifoCoverage({
    events: [event],
    saleItems: [item],
    allocations: [],
  })
  assert.equal(result.complete, false)
  assert.equal(result.divergences[0].code, 'missing_allocation')
})

test('soma exata detecta falta e excesso sem depender da ordem das origens', () => {
  for (const quantity of ['2.999', '3.001']) {
    const result = diagnoseDeliveryFifoCoverage({
      events: [event],
      saleItems: [item],
      allocations: [{ ...allocation, quantity }],
    })
    assert.equal(result.divergences[0].code, 'quantity_mismatch')
  }
})

test('valor inválido é sanitizado e não vira zero', () => {
  for (const quantity of ['synthetic-secret', '0.000', '-1.000']) {
    const result = diagnoseDeliveryFifoCoverage({
      events: [event],
      saleItems: [item],
      allocations: [{ ...allocation, quantity }],
    })
    assert.equal(result.divergences[0].code, 'invalid_quantity')
    assert.doesNotMatch(JSON.stringify(result), /secret/)
    const invalidItem = diagnoseDeliveryFifoCoverage({
      events: [event],
      saleItems: [{ ...item, quantity }],
      allocations: [allocation],
    })
    assert.equal(invalidItem.divergences[0].code, 'invalid_quantity')
    assert.doesNotMatch(JSON.stringify(invalidItem), /secret/)
  }
})

test('compensação de outro período não demanda nova alocação e entrega duplicada não dobra escopo', () => {
  const refund = { type: 'cash_refund', saleId: 1 }
  assert.deepEqual(
    diagnoseDeliveryFifoCoverage({
      events: [refund],
      saleItems: [item],
      allocations: [],
    }),
    {
      checkedDeliveries: 0,
      checkedItems: 0,
      complete: true,
      divergences: [],
    },
  )
  assert.equal(
    diagnoseDeliveryFifoCoverage({
      events: [event, event, refund],
      saleItems: [item],
      allocations: [allocation],
    }).checkedDeliveries,
    1,
  )
})
