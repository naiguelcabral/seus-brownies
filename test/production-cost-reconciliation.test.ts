import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileProductionCosts } from '../src/features/production/cost-reconciliation'

const output = {
  id: 1,
  productId: 10,
  actualQuantity: '2.125',
  allocatedCost: '1.01',
}
const layer = {
  id: 20,
  productionBatchOutputId: 1,
  productId: 10,
  originalQuantity: '2.125',
  originalCost: '1.01',
}

test('custo do lote fecha com saídas e origens FIFO sem usar saldo remanescente', () => {
  const consumedLayer = {
    ...layer,
    remainingQuantity: '0.000',
    remainingCost: '0.00',
  }
  assert.deepEqual(
    reconcileProductionCosts('1.01', [output], [consumedLayer]),
    [],
  )
  assert.deepEqual(
    reconcileProductionCosts(
      '90071992547410.00',
      [
        { ...output, allocatedCost: '90071992547409.93' },
        { ...output, id: 2, productId: 11, allocatedCost: '0.07' },
      ],
      [
        { ...layer, originalCost: '90071992547409.93' },
        {
          ...layer,
          id: 21,
          productionBatchOutputId: 2,
          productId: 11,
          originalCost: '0.07',
        },
      ],
    ),
    [],
  )
})

test('centavo e milésimo divergentes são identificados independentemente', () => {
  assert.deepEqual(
    reconcileProductionCosts(
      '1.02',
      [output],
      [{ ...layer, originalQuantity: '2.124', originalCost: '1.00' }],
    ).map((x) => x.code),
    [
      'layer_quantity_mismatch',
      'layer_cost_mismatch',
      'allocation_total_mismatch',
    ],
  )
})

test('origem FIFO ausente ou ligada a produto incorreto nunca concilia', () => {
  assert.deepEqual(reconcileProductionCosts('1.01', [output], []), [
    { code: 'missing_fifo_layer', outputId: 1, layerId: null },
  ])
  assert.deepEqual(
    reconcileProductionCosts('1.01', [output], [{ ...layer, productId: 99 }]),
    [{ code: 'layer_product_mismatch', outputId: 1, layerId: 20 }],
  )
})

test('lacunas e decimais inválidos não viram custo ou quantidade zero', () => {
  const result = reconcileProductionCosts(
    '0.00',
    [{ ...output, actualQuantity: null, allocatedCost: null }],
    [{ ...layer, originalCost: 'SYNTHETIC_INVALID' }],
  )
  assert.deepEqual(
    result.map((x) => x.code),
    ['invalid_output_fact', 'invalid_layer_fact'],
  )
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_INVALID/)
  assert.deepEqual(
    reconcileProductionCosts(null, [], []).map((x) => x.code),
    ['invalid_batch_cost', 'missing_outputs'],
  )
})
