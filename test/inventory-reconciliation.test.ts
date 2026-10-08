import assert from 'node:assert/strict'
import test from 'node:test'

import { reconcileInventoryLedger } from '../src/features/reports/inventory-reconciliation'

const consistent = () => ({
  layers: [
    {
      id: 1,
      productId: 7,
      originalQuantity: '10.000',
      originalCost: '40.00',
      remainingQuantity: '7.000',
      remainingCost: '28.00',
    },
  ],
  allocations: [
    {
      id: 2,
      layerId: 1,
      outgoingMovementId: 3,
      productId: 7,
      quantity: '4.000',
      allocatedCost: '16.00',
      movementProductId: 7,
      movementQuantity: '-4.000',
      movementCost: '16.00',
    },
  ],
  reversals: [
    {
      id: 4,
      allocationId: 2,
      incomingMovementId: 5,
      quantity: '1.000',
      restoredCost: '4.00',
      movementProductId: 7,
      movementQuantity: '1.000',
      movementCost: '4.00',
    },
  ],
})

test('reconcilia camada, alocação, reversão, movimentos e CMV sem escrever', () => {
  assert.deepEqual(reconcileInventoryLedger(consistent()), {
    checked: { layers: 1, allocations: 1, reversals: 1, movements: 2 },
    divergences: [],
  })
})

test('emite divergências rastreáveis para quantidade, custo e produto', () => {
  const input = consistent()
  input.layers[0].remainingQuantity = '6.000'
  input.layers[0].remainingCost = '27.00'
  input.allocations[0].movementQuantity = '-3.000'
  input.allocations[0].movementCost = '15.00'
  input.reversals[0].movementQuantity = '2.000'
  input.reversals[0].movementCost = '3.00'
  input.reversals[0].movementProductId = 9

  const result = reconcileInventoryLedger(input)
  assert.deepEqual(
    result.divergences.map((item) => item.code),
    [
      'layer_quantity_mismatch',
      'layer_cost_mismatch',
      'outgoing_movement_quantity_mismatch',
      'outgoing_movement_cost_mismatch',
      'reversal_movement_quantity_mismatch',
      'reversal_movement_cost_mismatch',
      'product_mismatch',
    ],
  )
  assert.equal(
    result.divergences.every((item) => item.relatedIds.length > 0),
    true,
  )
})

test('identifica camada e alocação ausentes sem inferir vínculo fictício', () => {
  const input = consistent()
  input.allocations[0].layerId = 99
  input.reversals[0].allocationId = 88

  const result = reconcileInventoryLedger(input)
  assert.deepEqual(
    result.divergences
      .filter((item) => item.code.startsWith('missing_'))
      .map(({ code, entityType, entityId, relatedIds }) => ({
        code,
        entityType,
        entityId,
        relatedIds,
      })),
    [
      {
        code: 'missing_layer',
        entityType: 'allocation',
        entityId: 2,
        relatedIds: [99],
      },
      {
        code: 'missing_allocation',
        entityType: 'reversal',
        entityId: 4,
        relatedIds: [88],
      },
    ],
  )
})

test('compara o produto da alocação com o da camada de origem', () => {
  const input = consistent()
  input.allocations[0].productId = 9

  assert.deepEqual(
    reconcileInventoryLedger(input).divergences.filter(
      (item) => item.entityType === 'allocation',
    ),
    [
      {
        code: 'product_mismatch',
        entityType: 'allocation',
        entityId: 2,
        relatedIds: [1],
        expected: '7',
        actual: '9',
      },
    ],
  )
})

test('soma reversões parciais antes de comparar com a alocação', () => {
  const input = consistent()
  input.reversals[0].quantity = '3.000'
  input.reversals[0].restoredCost = '12.00'
  input.reversals.push({
    ...input.reversals[0],
    id: 6,
    incomingMovementId: 7,
    quantity: '2.000',
    restoredCost: '8.00',
    movementQuantity: '2.000',
    movementCost: '8.00',
  })

  const result = reconcileInventoryLedger(input)
  assert.deepEqual(
    result.divergences
      .filter((item) => item.code.includes('exceeds_allocation'))
      .map(({ code, relatedIds, actual }) => ({ code, relatedIds, actual })),
    [
      {
        code: 'reversal_quantity_exceeds_allocation',
        relatedIds: [4, 6],
        actual: '5.000',
      },
      {
        code: 'reversal_cost_exceeds_allocation',
        relatedIds: [4, 6],
        actual: '20.00',
      },
    ],
  )
})

test('decimal inválido é diagnóstico explícito e não vira zero', () => {
  const input = consistent()
  input.layers[0].originalQuantity = '10.0001'
  input.allocations[0].allocatedCost = 'token-exemplo'

  const result = reconcileInventoryLedger(input)
  assert.deepEqual(
    result.divergences.map((item) => item.code),
    ['invalid_decimal', 'invalid_decimal'],
  )
  assert.equal(
    result.divergences.every((item) => item.actual === 'valor inválido'),
    true,
  )
  assert.doesNotMatch(JSON.stringify(result), /token-exemplo/)
})
