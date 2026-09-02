export type InventoryCostLayer = {
  id: number
  productId: number
  productionBatchOutputId: number | null
  sourceStockMovementId: number
  origin: 'production' | 'purchase' | 'adjustment'
  availableAt: string
  originalQuantity: bigint
  originalCost: bigint
  remainingQuantity: bigint
  remainingCost: bigint
}

export type InventoryCostAllocation = {
  layerId: number
  productId: number
  productionBatchOutputId: number | null
  sourceStockMovementId: number
  quantity: bigint
  allocatedCost: bigint
}

export type ReversibleFifoAllocation = InventoryCostAllocation & {
  id: number
  reversedQuantity?: bigint
  reversedCost?: bigint
}

export type FifoReversalPlan = {
  reversals: Array<{
    originalAllocationId: number
    layerId: number
    productId: number
    quantity: bigint
    allocatedCost: bigint
  }>
  layers: InventoryCostLayer[]
  restoredCost: bigint
}

export type FifoAllocationPlan = {
  allocations: InventoryCostAllocation[]
  layers: InventoryCostLayer[]
  allocatedCost: bigint
}

export function createsSaleCostAllocation(status: string) {
  return status === 'confirmed' || status === 'paid'
}

export function createProductionCostLayer(input: {
  id: number
  productId: number
  productionBatchOutputId: number
  sourceStockMovementId: number
  availableAt: string
  quantity: bigint
  allocatedCost: bigint
}): InventoryCostLayer {
  if (input.quantity <= 0n || input.allocatedCost < 0n)
    throw new Error('Saída de produção inválida para camada FIFO.')
  return {
    id: input.id,
    productId: input.productId,
    productionBatchOutputId: input.productionBatchOutputId,
    sourceStockMovementId: input.sourceStockMovementId,
    origin: 'production',
    availableAt: input.availableAt,
    originalQuantity: input.quantity,
    originalCost: input.allocatedCost,
    remainingQuantity: input.quantity,
    remainingCost: input.allocatedCost,
  }
}

/** Purchased finished goods and positive adjustments are separate FIFO origins. */
export function createIncomingCostLayer(input: {
  id: number
  productId: number
  sourceStockMovementId: number
  availableAt: string
  quantity: bigint
  allocatedCost: bigint
  origin: 'purchase' | 'adjustment'
}): InventoryCostLayer {
  if (input.quantity <= 0n || input.allocatedCost < 0n)
    throw new Error('Entrada FIFO inválida.')
  return {
    id: input.id,
    productId: input.productId,
    productionBatchOutputId: null,
    sourceStockMovementId: input.sourceStockMovementId,
    origin: input.origin,
    availableAt: input.availableAt,
    originalQuantity: input.quantity,
    originalCost: input.allocatedCost,
    remainingQuantity: input.quantity,
    remainingCost: input.allocatedCost,
  }
}

export function orderFifoLayers(layers: InventoryCostLayer[], productId: number) {
  return layers
    .filter(
      (layer) =>
        layer.productId === productId && layer.remainingQuantity > 0n,
    )
    .sort((left, right) => {
      const byDate = left.availableAt.localeCompare(right.availableAt)
      if (byDate) return byDate
      const byOutput =
        (left.productionBatchOutputId ?? 0) - (right.productionBatchOutputId ?? 0)
      return byOutput || left.id - right.id
    })
}

/**
 * Restores cost only to the layer consumed by the immutable original allocation.
 * A reversal never deletes or changes the original accounting fact.
 */
export function reverseFifoAllocations(
  layers: InventoryCostLayer[],
  allocations: ReversibleFifoAllocation[],
  requested: Array<{ allocationId: number; quantity: bigint }>,
): FifoReversalPlan {
  const updated = new Map(layers.map((layer) => [layer.id, { ...layer }]))
  const byAllocation = new Map(allocations.map((allocation) => [allocation.id, allocation]))
  const seen = new Set<number>()
  const reversals: FifoReversalPlan['reversals'] = []

  for (const request of requested) {
    if (request.quantity <= 0n || seen.has(request.allocationId))
      throw new Error('Reversão FIFO inválida ou duplicada.')
    seen.add(request.allocationId)
    const allocation = byAllocation.get(request.allocationId)
    if (!allocation) throw new Error('Alocação FIFO original não encontrada.')
    const alreadyReversedQuantity = allocation.reversedQuantity ?? 0n
    const alreadyReversedCost = allocation.reversedCost ?? 0n
    const availableQuantity = allocation.quantity - alreadyReversedQuantity
    const availableCost = allocation.allocatedCost - alreadyReversedCost
    if (request.quantity > availableQuantity)
      throw new Error('Devolução ou cancelamento excede a quantidade vendida.')
    const restoredCost = allocatedCents(
      availableCost,
      request.quantity,
      availableQuantity,
    )
    const layer = updated.get(allocation.layerId)
    if (!layer) throw new Error('Camada FIFO original não encontrada.')
    layer.remainingQuantity += request.quantity
    layer.remainingCost += restoredCost
    if (
      layer.remainingQuantity > layer.originalQuantity ||
      layer.remainingCost > layer.originalCost
    )
      throw new Error('Reversão excede o saldo original da camada FIFO.')
    reversals.push({
      originalAllocationId: allocation.id,
      layerId: layer.id,
      productId: allocation.productId,
      quantity: request.quantity,
      allocatedCost: restoredCost,
    })
  }
  return {
    reversals,
    layers: [...updated.values()],
    restoredCost: reversals.reduce((sum, reversal) => sum + reversal.allocatedCost, 0n),
  }
}

function allocatedCents(
  remainingCost: bigint,
  quantity: bigint,
  remainingQuantity: bigint,
) {
  if (quantity === remainingQuantity) return remainingCost
  return (remainingCost * quantity + remainingQuantity / 2n) / remainingQuantity
}

/**
 * Allocates a sale against production-output layers. The final consumption of
 * a layer receives its exact remaining cents, so every layer reconciles.
 */
export function allocateFifoCost(
  layers: InventoryCostLayer[],
  productId: number,
  quantity: bigint,
): FifoAllocationPlan {
  if (quantity <= 0n) throw new Error('Quantidade de venda inválida para FIFO.')

  const updated = new Map(layers.map((layer) => [layer.id, { ...layer }]))
  const allocations: InventoryCostAllocation[] = []
  let pending = quantity

  for (const layer of orderFifoLayers([...updated.values()], productId)) {
    if (!pending) break
    const consumed = pending < layer.remainingQuantity ? pending : layer.remainingQuantity
    const cost = allocatedCents(
      layer.remainingCost,
      consumed,
      layer.remainingQuantity,
    )
    if (cost < 0n || cost > layer.remainingCost)
      throw new Error('Custo FIFO inválido para camada de estoque.')

    layer.remainingQuantity -= consumed
    layer.remainingCost -= cost
    pending -= consumed
    allocations.push({
      layerId: layer.id,
      productId,
      productionBatchOutputId: layer.productionBatchOutputId,
      sourceStockMovementId: layer.sourceStockMovementId,
      quantity: consumed,
      allocatedCost: cost,
    })
  }

  if (pending > 0n)
    throw new Error('Estoque FIFO de produção insuficiente para a venda.')

  return {
    allocations,
    layers: [...updated.values()],
    allocatedCost: allocations.reduce(
      (sum, allocation) => sum + allocation.allocatedCost,
      0n,
    ),
  }
}

export function assertNoDuplicateLayerAllocations(
  allocations: Array<{ layerId: number; outgoingStockMovementId: number }>,
) {
  const seen = new Set<string>()
  for (const allocation of allocations) {
    const key = `${allocation.layerId}:${allocation.outgoingStockMovementId}`
    if (seen.has(key)) throw new Error('Alocação FIFO duplicada.')
    seen.add(key)
  }
}
