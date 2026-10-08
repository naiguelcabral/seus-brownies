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
  entityType: 'layer' | 'stock_movement' | 'reversal'
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
  }>
  allocations: Array<{
    id: number
    layerId: number
    outgoingMovementId: number
    productId: number
    quantity: string
    allocatedCost: string
    movementProductId: number
    movementQuantity: string
    movementCost: string | null
  }>
  reversals: Array<{
    id: number
    allocationId: number
    incomingMovementId: number
    quantity: string
    restoredCost: string
    movementProductId: number
    movementQuantity: string
    movementCost: string | null
  }>
}

const asQuantity = (value: string) => quantityToThousandths(value) ?? 0n
const asMoney = (value: string | null) => moneyToCents(value) ?? 0n
const decimal = (value: bigint, scale: bigint, places: number) => {
  const sign = value < 0n ? '-' : ''
  const absolute = value < 0n ? -value : value
  return `${sign}${absolute / scale}.${String(absolute % scale).padStart(places, '0')}`
}
const quantity = (value: bigint) => decimal(value, 1_000n, 3)
const money = (value: bigint) => decimal(value, 100n, 2)

/** Produces diagnostic facts only. It never writes or proposes data repair. */
export function reconcileInventoryLedger(input: ReconciliationInput) {
  const divergences: ReconciliationDivergence[] = []
  const allocationById = new Map(input.allocations.map((row) => [row.id, row]))
  const reversalsByAllocation = new Map<number, typeof input.reversals>()
  for (const reversal of input.reversals) {
    const rows = reversalsByAllocation.get(reversal.allocationId) ?? []
    rows.push(reversal)
    reversalsByAllocation.set(reversal.allocationId, rows)
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
        sum +
        (reversalsByAllocation.get(row.id) ?? []).reduce(
          (subtotal, reversal) => subtotal + asMoney(reversal.restoredCost),
          0n,
        ),
      0n,
    )
    const expectedQuantity =
      asQuantity(layer.originalQuantity) -
      allocations.reduce((sum, row) => sum + asQuantity(row.quantity), 0n) +
      reversedQuantity
    const expectedCost =
      asMoney(layer.originalCost) -
      allocations.reduce((sum, row) => sum + asMoney(row.allocatedCost), 0n) +
      reversedCost

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
    if (expectedCost !== asMoney(layer.remainingCost)) {
      divergences.push({
        code: 'layer_cost_mismatch',
        entityType: 'layer',
        entityId: layer.id,
        relatedIds: allocations.map((row) => row.id),
        expected: money(expectedCost),
        actual: layer.remainingCost,
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
    const movement = allocations[0]
    const expectedQuantity = allocations.reduce(
      (sum, row) => sum + asQuantity(row.quantity),
      0n,
    )
    const expectedCost = allocations.reduce(
      (sum, row) => sum + asMoney(row.allocatedCost),
      0n,
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
      movement.movementCost === null ||
      asMoney(movement.movementCost) !== expectedCost
    ) {
      divergences.push({
        code: 'outgoing_movement_cost_mismatch',
        entityType: 'stock_movement',
        entityId: movementId,
        relatedIds: allocations.map((row) => row.id),
        expected: money(expectedCost),
        actual: movement.movementCost ?? 'null',
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
        expected: String(mismatched[0].productId),
        actual: String(mismatched[0].movementProductId),
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
      reversal.movementCost === null ||
      asMoney(reversal.movementCost) !== asMoney(reversal.restoredCost)
    ) {
      divergences.push({
        code: 'reversal_movement_cost_mismatch',
        entityType: 'reversal',
        entityId: reversal.id,
        relatedIds: [reversal.allocationId, reversal.incomingMovementId],
        expected: reversal.restoredCost,
        actual: reversal.movementCost ?? 'null',
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

  return {
    checked: {
      layers: input.layers.length,
      allocations: input.allocations.length,
      reversals: input.reversals.length,
      movements: new Set([
        ...input.allocations.map((row) => row.outgoingMovementId),
        ...input.reversals.map((row) => row.incomingMovementId),
      ]).size,
    },
    divergences,
  }
}
