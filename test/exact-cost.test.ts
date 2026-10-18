import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCosts,
  decimalCost,
  displayCostCents,
  exactCost,
  scaleCost,
  subtractCosts,
  sumCosts,
} from '../src/lib/exact-cost'
import { calculateExactInventoryState } from '../src/features/production/calculations'
import type { CostedMovement } from '../src/features/production/calculations'
import { convertKilogramTotalPurchase } from '../src/features/operations/purchase-units'
import {
  allocateFifoCost,
  reverseFifoAllocations,
} from '../src/features/inventory/fifo'
import {
  summarizeFifoMargins,
  valueInventory,
} from '../src/features/reports/calculations'
import { summarizeAccrualMargins } from '../src/features/finance/accrual-margins'

test('relatórios e CMV somam as frações antes de exibir duas casas', () => {
  const allocations = Array.from({ length: 4 }, (_, index) => ({
    id: index + 1,
    allocationId: index + 1,
    saleItemId: 1,
    productId: 1,
    productName: 'Brownie',
    productionBatchId: 1,
    quantity: '1',
    allocatedCost: '3.13',
    exactCost: decimalCost('3.125'),
    saleItemRevenue: '20.00',
  }))
  assert.equal(summarizeFifoMargins(allocations).cogs, '12.50')
  const accrual = summarizeAccrualMargins({
    events: [
      {
        id: 1,
        type: 'sale_revenue',
        saleId: 1,
        saleItemId: null,
        revenueEffect: '20.00',
      },
    ],
    sales: [{ id: 1, locationId: 1, locationName: 'Loja' }],
    saleItems: [
      {
        id: 1,
        saleId: 1,
        productId: 1,
        productName: 'Brownie',
        revenue: '20.00',
      },
    ],
    allocations,
  })
  assert.equal(accrual.cogs, '12.50')
  assert.equal(accrual.grossMargin, '7.50')
  assert.equal(accrual.reconciled, true)
  const inventory = valueInventory([
    {
      productId: 1,
      productName: 'Farinha',
      unit: 'g',
      quantityDelta: '1000',
      unitCost: '0.013',
      allocatedCost: '12.50',
      exactCost: decimalCost('12.50'),
    },
    {
      productId: 1,
      productName: 'Farinha',
      unit: 'g',
      quantityDelta: '-250',
      unitCost: '0.013',
      allocatedCost: '3.13',
      exactCost: decimalCost('3.125'),
    },
  ])
  assert.equal(inventory[0]?.value, '9.38')
})

test('entrada em kg usa o valor total lançado, sem multiplicá-lo pela quantidade', () => {
  const stock = convertKilogramTotalPurchase('g', 1_250n, 1_250n)
  assert.equal(stock.quantity, '1250.000')
  const state = calculateExactInventoryState([
    {
      quantityDelta: stock.quantity,
      unitCost: null,
      exactCost: decimalCost('12.50'),
    },
  ])
  assert.deepEqual(state.value, exactCost(25n, 2n))
  assert.deepEqual(
    scaleCost(state.value, 250_000n, state.quantity),
    decimalCost('2.50'),
  )
})

test('250 g custam exatamente 3,125 e quatro consumos fecham 12,50 sem resíduos', () => {
  const movements: CostedMovement[] = [
    {
      quantityDelta: '1000.000',
      unitCost: '0.013',
      allocatedCost: '12.50',
      exactCost: decimalCost('12.50'),
    },
  ]
  const consumed = []
  for (let index = 0; index < 4; index++) {
    const state = calculateExactInventoryState(movements)
    const cost = scaleCost(state.value, 250_000n, state.quantity)
    assert.deepEqual(cost, decimalCost('3.125'))
    consumed.push(cost)
    movements.push({
      quantityDelta: '-250.000',
      unitCost: '0.013',
      allocatedCost: '3.13',
      exactCost: cost,
    })
  }
  assert.deepEqual(sumCosts(consumed), decimalCost('12.50'))
  assert.deepEqual(calculateExactInventoryState(movements), {
    quantity: 0n,
    value: exactCost(0n),
  })
  assert.equal(displayCostCents(consumed[0] ?? exactCost(0n)), 313n)
})

test('dízimas e múltiplas compras conservam o valor exato sem escolher escala decimal', () => {
  const third = scaleCost(decimalCost('10.00'), 1n, 3n)
  assert.deepEqual(third, exactCost(10n, 3n))
  assert.deepEqual(sumCosts([third, third, third]), decimalCost('10.00'))
  const state = calculateExactInventoryState([
    { quantityDelta: '3', unitCost: null, exactCost: decimalCost('10.00') },
    { quantityDelta: '-1', unitCost: null, exactCost: third },
    { quantityDelta: '1', unitCost: null, exactCost: decimalCost('2.00') },
  ])
  assert.deepEqual(state.value, exactCost(26n, 3n))
  const cost = scaleCost(state.value, 1_000n, state.quantity)
  assert.deepEqual(cost, exactCost(26n, 9n))
  assert.deepEqual(
    addCosts(cost, subtractCosts(state.value, cost)),
    state.value,
  )
})

test('FIFO e reversão carregam frações exatas independentemente da projeção em centavos', () => {
  const layer = {
    id: 1,
    productId: 1,
    productionBatchOutputId: 1,
    sourceStockMovementId: 1,
    origin: 'production' as const,
    availableAt: '2026-10-18',
    originalQuantity: 3_000n,
    remainingQuantity: 3_000n,
    originalCost: 313n,
    remainingCost: 313n,
    exactOriginalCost: decimalCost('3.125'),
    exactRemainingCost: decimalCost('3.125'),
  }
  const plan = allocateFifoCost([layer], 1, 1_000n)
  assert.deepEqual(plan.exactCost, exactCost(25n, 24n))
  const allocation = plan.allocations[0]
  assert.ok(allocation)
  const reversed = reverseFifoAllocations(
    plan.layers,
    [{ ...allocation, id: 2 }],
    [{ allocationId: 2, quantity: 1_000n }],
  )
  assert.deepEqual(reversed.layers[0]?.exactRemainingCost, decimalCost('3.125'))
  const all = allocateFifoCost(plan.layers, 1, 2_000n)
  assert.deepEqual(
    sumCosts([plan.exactCost ?? exactCost(0n), all.exactCost ?? exactCost(0n)]),
    decimalCost('3.125'),
  )
  assert.deepEqual(all.layers[0]?.exactRemainingCost, exactCost(0n))
})

test('validação rejeita custo racional corrompido, quantidade ou total inválidos', () => {
  assert.throws(() => exactCost(1n, 0n))
  assert.throws(() => scaleCost({ numerator: 'NaN', denominator: '1' }, 1n))
  assert.throws(() => decimalCost('1e-3'))
  for (const args of [
    ['unit', 1n, 10n],
    ['g', 0n, 10n],
    ['g', 1n, 0n],
  ] as const)
    assert.throws(() => convertKilogramTotalPurchase(args[0], args[1], args[2]))
  assert.equal(displayCostCents(decimalCost('-3.125')), -313n)
})

test('fato legado sem custo exato conserva a regra monetária registrada', () => {
  assert.deepEqual(
    calculateExactInventoryState([
      { quantityDelta: '1.250', unitCost: '2.005' },
    ]).value,
    decimalCost('2.51'),
  )
})
