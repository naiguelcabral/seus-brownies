import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readRecoveryConfig,
  calculateRecovery,
  allocateRecoveryCosts,
} from '../src/features/production/recovery'
import { decimalCost, sumCosts } from '../src/lib/exact-cost'
import type { ExactCost } from '../src/lib/exact-cost'
import { requireDefined } from '../src/lib/required-value'
import { persistProductionBatchCompletion } from '../src/features/production/functions'
import { createProductionDrizzleMock } from './helpers/production-drizzle-mock'

const payload = {
  recovery: {
    mode: 'weighed',
    bakedWeightGrams: '850.000',
    packWeightGrams: '100.000',
  },
}
const config = requireDefined(readRecoveryConfig(payload) ?? undefined)
test('massa fria e recuperação são físicas; pacotes inteiros e sobra ficam separados', () => {
  assert.deepEqual(calculateRecovery(config, 1000n, '350.123'), {
    totalMass: 850000n,
    packagedMass: 300000n,
    packages: 3000n,
    measuredGrams: '350.123',
    unpackagedGrams: '50.123',
  })
  assert.equal(calculateRecovery(config, 4000n, '1000').totalMass, 3400000n)
  assert.equal(calculateRecovery(config, 1000n, '0').packages, 0n)
  for (const value of [undefined, '-1', '850', '900', '1.0001'])
    assert.throws(
      () => calculateRecovery(config, 1000n, value),
      /Informe o peso/,
    )
})
test('custo por massa não transfere recheio e embalagem de um produto para outro', () => {
  const allocations = allocateRecoveryCosts({
    sharedCost: decimalCost('34.00'),
    directCosts: new Map([
      [1, decimalCost('6.00')],
      [2, decimalCost('0.54')],
    ]),
    primary: [{ productId: 1, quantity: 48000n, expectedYield: 48000n }],
    coProductId: 2,
    totalMass: 850000n,
    packagedMass: 200000n,
  })
  assert.deepEqual(allocations.get(1), decimalCost('32.00'))
  assert.deepEqual(allocations.get(2), decimalCost('8.54'))
  assert.deepEqual(sumCosts([...allocations.values()]), decimalCost('40.54'))
})
for (const measured of ['0', '300']) {
  test(`conclusão com recuperação ${measured} g preserva custo total e não gera sobra presumida`, async () => {
    const mock = createProductionDrizzleMock({
      recipePayload: payload,
      recoveredWeight: measured,
      coProductQuantity: measured === '0' ? '0.000' : '3.000',
    })
    await persistProductionBatchCompletion(mock.db, { id: 1 })
    const layers = mock.committed
      .filter((write) => write.table === 'inventory_cost_layers')
      .flatMap((write) => write.values)
    assert.equal(layers.length, measured === '0' ? 1 : 2)
    const total = sumCosts(
      layers.map((row) => row.exactOriginalCost as ExactCost),
    )
    assert.deepEqual(total, decimalCost('5.00'))
    assert.equal(mock.batch.status, 'completed')
  })
}
test('recuperação sem peso confirmado aborta antes da persistência', async () => {
  const mock = createProductionDrizzleMock({ recipePayload: payload })
  await assert.rejects(
    persistProductionBatchCompletion(mock.db, { id: 1 }),
    /Informe o peso/,
  )
  assert.deepEqual(mock.committed, [])
})
