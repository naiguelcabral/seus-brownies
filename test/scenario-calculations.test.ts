import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateScenarioProjection,
  compareProjectionWithRealized,
  normalizeScenarioMix,
  validateScenarioActivation,
} from '../src/features/scenarios/calculations'
import { scenarioDraftValues } from '../src/features/scenarios/contracts'

const products = [
  { id: 1, name: 'Brownie A', type: 'finished_product', isActive: true },
  { id: 2, name: 'Brownie B', type: 'finished_product', isActive: true },
  { id: 3, name: 'Brownie C', type: 'finished_product', isActive: true },
]

const draft = {
  name: 'Meta mensal',
  description: 'Cenário sintético',
  effectiveOn: '2026-10-01',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2200.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.7000',
  feeTaxReserveRate: '0.0300',
  mix: [
    {
      productId: 1,
      originalWeight: '0.33',
      plannedUnitPrice: '12.00',
      plannedUnitCost: '2.517',
    },
    {
      productId: 2,
      originalWeight: '0.35',
      plannedUnitPrice: '17.00',
      plannedUnitCost: '4.172',
    },
    {
      productId: 3,
      originalWeight: '0.35',
      plannedUnitPrice: '6.00',
      plannedUnitCost: '0.923',
    },
  ],
}

test('contrato aceita rascunho vazio, mas ativação bloqueia mix vazio', () => {
  const empty = { ...draft, mix: [] }
  assert.equal(scenarioDraftValues.safeParse(empty).success, true)
  assert.throws(
    () => validateScenarioActivation(empty, products),
    /ao menos um produto/,
  )
})

test('ativação bloqueia produto inativo ou que não seja produto final', () => {
  assert.throws(
    () =>
      validateScenarioActivation(draft, [
        { ...products[0], isActive: false },
        products[1],
        products[2],
      ]),
    /está inativo/,
  )
  assert.throws(
    () =>
      validateScenarioActivation(draft, [
        { ...products[0], type: 'ingredient' },
        products[1],
        products[2],
      ]),
    /não é um produto final/,
  )
})

test('normaliza soma abaixo de 100% com fechamento exato', () => {
  const result = normalizeScenarioMix([
    { ...draft.mix[0], originalWeight: '0.40' },
    { ...draft.mix[1], originalWeight: '0.50' },
  ])
  assert.equal(result.originalTotal, '0.900000')
  assert.equal(result.wasNormalized, true)
  assert.deepEqual(
    result.rows.map((row) => row.normalizedWeightBps),
    [4444, 5556],
  )
})

test('preserva soma exatamente igual a 100%', () => {
  const result = normalizeScenarioMix([
    { ...draft.mix[0], originalWeight: '0.40' },
    { ...draft.mix[1], originalWeight: '0.60' },
  ])
  assert.equal(result.originalTotal, '1.000000')
  assert.equal(result.wasNormalized, false)
  assert.equal(
    result.rows.reduce((sum, row) => sum + row.normalizedWeightBps, 0),
    10_000,
  )
})

test('normaliza 103% e distribui resíduo pelo maior resto e menor produto', () => {
  const result = normalizeScenarioMix(draft.mix)
  assert.equal(result.originalTotal, '1.030000')
  assert.equal(result.wasNormalized, true)
  assert.deepEqual(
    result.rows.map((row) => [row.productId, row.normalizedWeightBps]),
    [
      [1, 3204],
      [2, 3398],
      [3, 3398],
    ],
  )
})

test('projeção usa centavos, milésimos e pontos-base sem ponto flutuante', () => {
  const projection = calculateScenarioProjection(draft, products)
  assert.equal(projection.kind, 'projection')
  assert.equal(projection.normalizedMixTotalBps, 10_000)
  assert.equal(projection.marginNeededBeforeFixedCosts, '12200.00')
  assert.match(projection.targetRevenue, /^\d+\.\d{2}$/)
  assert.match(projection.mixGeneratedProfit, /^\d+\.\d{2}$/)
  assert.match(projection.projectedManagerialProfit, /^\d+\.\d{2}$/)
  assert.match(projection.gapToTarget, /^-?\d+\.\d{2}$/)
  assert.match(projection.targetAverageTicket ?? '', /^\d+\.\d{2}$/)
  assert.equal(projection.targetAverageTicketBasis, 'por unidade planejada')
  assert.equal(
    projection.productLines.reduce(
      (sum, row) => sum + row.normalizedWeightBps,
      0,
    ),
    10_000,
  )
  assert.equal(projection.productLines[0].plannedUnitCost, '2.517')
})

test('precisão monetária permanece exata no limite persistido', () => {
  const projection = calculateScenarioProjection(
    {
      ...draft,
      monthlyProfitGoal: '9999999999.99',
      fixedMonthlyCosts: '0.01',
      mix: [draft.mix[0]],
    },
    [products[0]],
  )
  assert.equal(projection.marginNeededBeforeFixedCosts, '10000000000.00')
  assert.ok(BigInt(projection.unitsPerMonth) > 0n)
})

test('resultado realizado fica separado da projeção e explicita ausência', () => {
  const projection = calculateScenarioProjection(draft, products)
  const missing = compareProjectionWithRealized(projection)
  assert.equal(missing.kind, 'realized')
  assert.equal(missing.status, 'missing')
  assert.equal(missing.managerialProfit.status, 'pending_decision')

  const realized = compareProjectionWithRealized(projection, {
    netRevenue: '100.00',
    cogs: '30.00',
    grossMargin: '70.00',
    byProduct: [
      {
        productId: 1,
        productName: 'Brownie A',
        revenue: '100.00',
        grossMargin: '70.00',
      },
    ],
  })
  assert.equal(realized.status, 'available')
  assert.equal(realized.productLines[0].realizedMargin, '70.00')
  assert.equal(realized.productLines[1].status, 'missing')
})
