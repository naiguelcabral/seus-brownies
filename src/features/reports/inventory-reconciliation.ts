import { requireDefined } from '../../lib/required-value'
import {
  addCosts,
  displayCostMoney,
  exactCost,
  readExactCost,
  subtractCosts,
} from '../../lib/exact-cost'
import type { ExactCost } from '../../lib/exact-cost'
import {
  moneyToCents,
  quantityToThousandths,
} from '#/features/production/calculations'

export type ReconciliationDivergence = {
  code:
    | 'layer_quantity_mismatch'
    | 'layer_cost_mismatch'
    | 'outgoing_movement_quantity_mismatch'
    | 'outgoing_movement_cost_mismatch'
    | 'reversal_movement_quantity_mismatch'
    | 'reversal_movement_cost_mismatch'
    | 'product_mismatch'
    | 'missing_layer'
    | 'missing_allocation'
    | 'reversal_quantity_exceeds_allocation'
    | 'reversal_cost_exceeds_allocation'
    | 'invalid_decimal'
  entityType: 'layer' | 'allocation' | 'stock_movement' | 'reversal'
  entityId: number
  relatedIds: number[]
  expected: string
  actual: string
}

export type ReconciliationInput = {
  layers: Array<{
    id: number
    productId: number
    originalQuantity: string
    originalCost: string
    remainingQuantity: string
    remainingCost: string
    exactOriginalCost?: ExactCost | null
    exactRemainingCost?: ExactCost | null
  }>
  allocations: Array<{
    id: number
    layerId: number
    outgoingMovementId: number
    productId: number
    quantity: string
    allocatedCost: string
    exactCost?: ExactCost | null
    movementProductId: number
    movementQuantity: string
    movementCost: string | null
    movementExactCost?: ExactCost | null
  }>
  reversals: Array<{
    id: number
    allocationId: number
    incomingMovementId: number
    quantity: string
    restoredCost: string
    exactCost?: ExactCost | null
    movementProductId: number
    movementQuantity: string
    movementCost: string | null
    movementExactCost?: ExactCost | null
  }>
}

const asQuantity = (value: string) => quantityToThousandths(value) ?? 0n
function asCost(
  exact: ExactCost | null | undefined,
  legacy: string | null,
): ExactCost | null {
  try {
    if (exact !== null && exact !== undefined) return readExactCost(exact)
    const cents = moneyToCents(legacy)
    return cents === null ? null : exactCost(cents, 100n)
  } catch {
    return null
  }
}
function requireCostValue(
  exact: ExactCost | null | undefined,
  legacy: string | null,
) {
  const value = asCost(exact, legacy)
  if (value === null) throw new Error('Custo ausente após a validação.')
  return value
}
const costEquals = (left: ExactCost, right: ExactCost) =>
  BigInt(left.numerator) * BigInt(right.denominator) ===
  BigInt(right.numerator) * BigInt(left.denominator)
const costGreaterThan = (left: ExactCost, right: ExactCost) =>
  BigInt(left.numerator) * BigInt(right.denominator) >
  BigInt(right.numerator) * BigInt(left.denominator)
const costLabel = (value: ExactCost) => displayCostMoney(value)
const decimal = (value: bigint, scale: bigint, places: number) => {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / scale}.${String(absolute % scale).padStart(places, '0')}`
}
const quantity = (value: bigint) => decimal(value, 1_000n, 3)

/** Produces diagnostic facts only. It never writes or proposes data repair. */
export function reconcileInventoryLedger(input: ReconciliationInput) {
  const divergences: ReconciliationDivergence[] = []
  const checked = {
    layers: input.layers.length,
    allocations: input.allocations.length,
    reversals: input.reversals.length,
    movements: new Set([
      ...input.allocations.map((row) => row.outgoingMovementId),
      ...input.reversals.map((row) => row.incomingMovementId),
    ]).size,
  }
  const requireQuantity = (
    entityType: ReconciliationDivergence['entityType'],
    entityId: number,
    field: string,
    value: string,
  ) => {
    if (quantityToThousandths(value) !== null) return
    divergences.push({
      code: 'invalid_decimal',
      entityType,
      entityId,
      relatedIds: [entityId],
      expected: `${field}: decimal de até 3 casas`,
      actual: 'valor inválido',
    })
  }
  const requireCost = (
    entityType: ReconciliationDivergence['entityType'],
    entityId: number,
    field: string,
    exact: ExactCost | null | undefined,
    legacy: string | null,
  ) => {
    if (asCost(exact, legacy) !== null) return
    divergences.push({
      code: 'invalid_decimal',
      entityType,
      entityId,
      relatedIds: [entityId],
      expected: `${field}: custo exato válido ou decimal de até 2 casas`,
      actual: 'valor inválido',
    })
  }
  for (const layer of input.layers) {
    requireQuantity(
      'layer',
      layer.id,
      'originalQuantity',
      layer.originalQuantity,
    )
    requireQuantity(
      'layer',
      layer.id,
      'remainingQuantity',
      layer.remainingQuantity,
    )
    requireCost(
      'layer',
      layer.id,
      'originalCost',
      layer.exactOriginalCost,
      layer.originalCost,
    )
    requireCost(
      'layer',
      layer.id,
      'remainingCost',
      layer.exactRemainingCost,
      layer.remainingCost,
    )
  }
  for (const allocation of input.allocations) {
    requireQuantity(
      'allocation',
      allocation.id,
      'quantity',
      allocation.quantity,
    )
    requireCost(
      'allocation',
      allocation.id,
      'allocatedCost',
      allocation.exactCost,
      allocation.allocatedCost,
    )
    requireQuantity(
      'stock_movement',
      allocation.outgoingMovementId,
      'quantityDelta',
      allocation.movementQuantity,
    )
    requireCost(
      'stock_movement',
      allocation.outgoingMovementId,
      'allocatedCost',
      allocation.movementExactCost,
      allocation.movementCost,
    )
  }
  for (const reversal of input.reversals) {
    requireQuantity('reversal', reversal.id, 'quantity', reversal.quantity)
    requireCost(
      'reversal',
      reversal.id,
      'restoredCost',
      reversal.exactCost,
      reversal.restoredCost,
    )
    requireQuantity(
      'stock_movement',
      reversal.incomingMovementId,
      'quantityDelta',
      reversal.movementQuantity,
    )
    requireCost(
      'stock_movement',
      reversal.incomingMovementId,
      'allocatedCost',
      reversal.movementExactCost,
      reversal.movementCost,
    )
  }
  // Never turn malformed numeric data into zero and report false reconciliation.
  if (divergences.length) return { checked, divergences }

  const layerById = new Map(input.layers.map((row) => [row.id, row]))
  const allocationById = new Map(input.allocations.map((row) => [row.id, row]))
  const reversalsByAllocation = new Map<number, typeof input.reversals>()
  for (const reversal of input.reversals) {
    const rows = reversalsByAllocation.get(reversal.allocationId) ?? []
    rows.push(reversal)
    reversalsByAllocation.set(reversal.allocationId, rows)
  }

  for (const allocation of input.allocations) {
    const layer = layerById.get(allocation.layerId)
    if (!layer) {
      divergences.push({
        code: 'missing_layer',
        entityType: 'allocation',
        entityId: allocation.id,
        relatedIds: [allocation.layerId],
        expected: String(allocation.layerId),
        actual: 'camada ausente',
      })
    } else if (layer.productId !== allocation.productId) {
      divergences.push({
        code: 'product_mismatch',
        entityType: 'allocation',
        entityId: allocation.id,
        relatedIds: [layer.id],
        expected: String(layer.productId),
        actual: String(allocation.productId),
      })
    }
    const reversals = reversalsByAllocation.get(allocation.id) ?? []
    const reversedQuantity = reversals.reduce(
      (sum, row) => sum + asQuantity(row.quantity),
      0n,
    )
    const reversedCost = reversals.reduce(
      (sum, row) =>
        addCosts(sum, requireCostValue(row.exactCost, row.restoredCost)),
      exactCost(0n),
    )
    if (reversedQuantity > asQuantity(allocation.quantity)) {
      divergences.push({
        code: 'reversal_quantity_exceeds_allocation',
        entityType: 'allocation',
        entityId: allocation.id,
        relatedIds: reversals.map((row) => row.id),
        expected: `até ${allocation.quantity}`,
        actual: quantity(reversedQuantity),
      })
    }
    if (
      costGreaterThan(
        reversedCost,
        requireCostValue(allocation.exactCost, allocation.allocatedCost),
      )
    ) {
      divergences.push({
        code: 'reversal_cost_exceeds_allocation',
        entityType: 'allocation',
        entityId: allocation.id,
        relatedIds: reversals.map((row) => row.id),
        expected: `até ${allocation.allocatedCost}`,
        actual: costLabel(reversedCost),
      })
    }
  }
  for (const reversal of input.reversals) {
    if (allocationById.has(reversal.allocationId)) continue
    divergences.push({
      code: 'missing_allocation',
      entityType: 'reversal',
      entityId: reversal.id,
      relatedIds: [reversal.allocationId],
      expected: String(reversal.allocationId),
      actual: 'alocação ausente',
    })
  }

  for (const layer of input.layers) {
    const allocations = input.allocations.filter(
      (row) => row.layerId === layer.id,
    )
    const reversedQuantity = allocations.reduce(
      (sum, row) =>
        sum +
        (reversalsByAllocation.get(row.id) ?? []).reduce(
          (subtotal, reversal) => subtotal + asQuantity(reversal.quantity),
          0n,
        ),
      0n,
    )
    const reversedCost = allocations.reduce(
      (sum, row) =>
        addCosts(
          sum,
          (reversalsByAllocation.get(row.id) ?? []).reduce(
            (subtotal, reversal) =>
              addCosts(
                subtotal,
                requireCostValue(reversal.exactCost, reversal.restoredCost),
              ),
            exactCost(0n),
          ),
        ),
      exactCost(0n),
    )
    const expectedQuantity =
      asQuantity(layer.originalQuantity) -
      allocations.reduce((sum, row) => sum + asQuantity(row.quantity), 0n) +
      reversedQuantity
    const expectedCost = addCosts(
      subtractCosts(
        requireCostValue(layer.exactOriginalCost, layer.originalCost),
        allocations.reduce(
          (sum, row) =>
            addCosts(sum, requireCostValue(row.exactCost, row.allocatedCost)),
          exactCost(0n),
        ),
      ),
      reversedCost,
    )

    if (expectedQuantity !== asQuantity(layer.remainingQuantity)) {
      divergences.push({
        code: 'layer_quantity_mismatch',
        entityType: 'layer',
        entityId: layer.id,
        relatedIds: allocations.map((row) => row.id),
        expected: quantity(expectedQuantity),
        actual: layer.remainingQuantity,
      })
    }
    if (
      !costEquals(
        expectedCost,
        requireCostValue(layer.exactRemainingCost, layer.remainingCost),
      )
    ) {
      divergences.push({
        code: 'layer_cost_mismatch',
        entityType: 'layer',
        entityId: layer.id,
        relatedIds: allocations.map((row) => row.id),
        expected: costLabel(expectedCost),
        actual: costLabel(
          requireCostValue(layer.exactRemainingCost, layer.remainingCost),
        ),
      })
    }
  }

  const allocationsByMovement = new Map<number, typeof input.allocations>()
  for (const allocation of input.allocations) {
    const rows = allocationsByMovement.get(allocation.outgoingMovementId) ?? []
    rows.push(allocation)
    allocationsByMovement.set(allocation.outgoingMovementId, rows)
  }
  for (const [movementId, allocations] of allocationsByMovement) {
    const movement = requireDefined(allocations[0])
    const expectedQuantity = allocations.reduce(
      (sum, row) => sum + asQuantity(row.quantity),
      0n,
    )
    const expectedCost = allocations.reduce(
      (sum, row) =>
        addCosts(sum, requireCostValue(row.exactCost, row.allocatedCost)),
      exactCost(0n),
    )
    if (-asQuantity(movement.movementQuantity) !== expectedQuantity) {
      divergences.push({
        code: 'outgoing_movement_quantity_mismatch',
        entityType: 'stock_movement',
        entityId: movementId,
        relatedIds: allocations.map((row) => row.id),
        expected: quantity(-expectedQuantity),
        actual: movement.movementQuantity,
      })
    }
    if (
      !costEquals(
        requireCostValue(movement.movementExactCost, movement.movementCost),
        expectedCost,
      )
    ) {
      divergences.push({
        code: 'outgoing_movement_cost_mismatch',
        entityType: 'stock_movement',
        entityId: movementId,
        relatedIds: allocations.map((row) => row.id),
        expected: costLabel(expectedCost),
        actual: costLabel(
          requireCostValue(movement.movementExactCost, movement.movementCost),
        ),
      })
    }
    const mismatched = allocations.filter(
      (row) => row.productId !== row.movementProductId,
    )
    if (mismatched.length) {
      divergences.push({
        code: 'product_mismatch',
        entityType: 'stock_movement',
        entityId: movementId,
        relatedIds: mismatched.map((row) => row.id),
        expected: String(requireDefined(mismatched[0]).productId),
        actual: String(requireDefined(mismatched[0]).movementProductId),
      })
    }
  }

  for (const reversal of input.reversals) {
    const allocation = allocationById.get(reversal.allocationId)
    if (
      asQuantity(reversal.movementQuantity) !== asQuantity(reversal.quantity)
    ) {
      divergences.push({
        code: 'reversal_movement_quantity_mismatch',
        entityType: 'reversal',
        entityId: reversal.id,
        relatedIds: [reversal.allocationId, reversal.incomingMovementId],
        expected: reversal.quantity,
        actual: reversal.movementQuantity,
      })
    }
    if (
      !costEquals(
        requireCostValue(reversal.movementExactCost, reversal.movementCost),
        requireCostValue(reversal.exactCost, reversal.restoredCost),
      )
    ) {
      divergences.push({
        code: 'reversal_movement_cost_mismatch',
        entityType: 'reversal',
        entityId: reversal.id,
        relatedIds: [reversal.allocationId, reversal.incomingMovementId],
        expected: costLabel(
          requireCostValue(reversal.exactCost, reversal.restoredCost),
        ),
        actual: costLabel(
          requireCostValue(reversal.movementExactCost, reversal.movementCost),
        ),
      })
    }
    if (allocation && allocation.productId !== reversal.movementProductId) {
      divergences.push({
        code: 'product_mismatch',
        entityType: 'reversal',
        entityId: reversal.id,
        relatedIds: [reversal.allocationId, reversal.incomingMovementId],
        expected: String(allocation.productId),
        actual: String(reversal.movementProductId),
      })
    }
  }

  return { checked, divergences }
}
