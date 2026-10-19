import assert from 'node:assert/strict'
import test from 'node:test'

import { exactCost } from '../src/lib/exact-cost'
import { reconcileOperationalIntegrity } from '../src/features/reports/integrity-reconciliation'
import type { IntegrityReconciliationInput } from '../src/features/reports/integrity-reconciliation'

function consistentInput(): IntegrityReconciliationInput {
  const exactUnit = exactCost(25n, 24n)
  const exactTotal = exactCost(25n, 8n)
  return {
    ledger: {
      layers: [
        {
          id: 1,
          productId: 10,
          originalQuantity: '3.000',
          originalCost: '3.13',
          exactOriginalCost: exactTotal,
          remainingQuantity: '2.000',
          remainingCost: '2.08',
          exactRemainingCost: exactCost(25n, 12n),
        },
      ],
      allocations: [
        {
          id: 2,
          layerId: 1,
          outgoingMovementId: 3,
          productId: 10,
          quantity: '1.000',
          allocatedCost: '1.04',
          exactCost: exactUnit,
          movementProductId: 10,
          movementQuantity: '-1.000',
          movementCost: '1.04',
          movementExactCost: exactUnit,
        },
      ],
      reversals: [],
    },
    production: [
      {
        id: 20,
        totalCost: '3.13',
        exactCost: exactTotal,
        outputs: [
          {
            id: 21,
            productId: 10,
            actualQuantity: '3.000',
            allocatedCost: '3.13',
            exactCost: exactTotal,
          },
        ],
        layers: [
          {
            id: 1,
            productionBatchOutputId: 21,
            productId: 10,
            originalQuantity: '3.000',
            originalCost: '3.13',
            exactOriginalCost: exactTotal,
          },
        ],
      },
    ],
    deliveries: {
      events: [{ type: 'sale_revenue', saleId: 30 }],
      saleItems: [{ id: 31, saleId: 30, quantity: '1.000' }],
      allocations: [{ id: 2, saleItemId: 31, quantity: '1.000' }],
    },
  }
}

test('consolida estoque, produção e CMV com frações exatas antes da exibição', () => {
  const result = reconcileOperationalIntegrity(consistentInput())

  assert.deepEqual(result, {
    complete: true,
    checked: {
      layers: 1,
      allocations: 1,
      reversals: 0,
      movements: 1,
      productionBatches: 1,
      productionOutputs: 1,
      deliveries: 1,
      deliveryItems: 1,
    },
    divergences: [],
  })
})

test('expõe fatos ausentes, consumo parcial e reversões inconsistentes sem repará-los', () => {
  const input = consistentInput()
  input.production[0]!.totalCost = null
  input.production[0]!.exactCost = null
  input.deliveries.allocations[0]!.quantity = '0.500'
  input.ledger.reversals.push({
    id: 4,
    allocationId: 2,
    incomingMovementId: 5,
    quantity: '2.000',
    restoredCost: '2.08',
    exactCost: exactCost(25n, 12n),
    movementProductId: 10,
    movementQuantity: '2.000',
    movementCost: '2.08',
    movementExactCost: exactCost(25n, 12n),
  })

  const result = reconcileOperationalIntegrity(input)
  assert.equal(result.complete, false)
  assert.deepEqual(
    result.divergences.map((item) => [item.area, item.code]),
    [
      ['cmv', 'quantity_mismatch'],
      ['estoque', 'reversal_cost_exceeds_allocation'],
      ['estoque', 'reversal_quantity_exceeds_allocation'],
      ['estoque', 'layer_cost_mismatch'],
      ['estoque', 'layer_quantity_mismatch'],
      ['produção', 'invalid_batch_cost'],
    ],
  )
  assert.equal(
    result.divergences.every((item) => item.message.length > 0),
    true,
  )
})

test('receita por competência sem venda vinculada permanece explícita', () => {
  const input = consistentInput()
  input.deliveries.events = [{ type: 'sale_revenue', saleId: null }]
  input.deliveries.saleItems = []
  input.deliveries.allocations = []

  const result = reconcileOperationalIntegrity(input)
  assert.deepEqual(result.divergences, [
    {
      area: 'cmv',
      code: 'missing_sale_reference',
      entityType: 'venda',
      entityId: null,
      relatedIds: [],
      message: 'Receita de entrega não aponta para uma venda.',
    },
  ])
})
