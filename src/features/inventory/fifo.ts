export type InventoryCostLayer = {
  id: number
  productId: number
  productionBatchOutputId: number
  sourceStockMovementId: number
  availableAt: string
  originalQuantity: bigint
  originalCost: bigint
  remainingQuantity: bigint
  remainingCost: bigint
}

export type InventoryCostAllocation = {
  layerId: number
  productId: number
  productionBatchOutputId: number
  sourceStockMovementId: number
  quantity: bigint
  allocatedCost: bigint
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
        left.productionBatchOutputId - right.productionBatchOutputId
      return byOutput || left.id - right.id
    })
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
