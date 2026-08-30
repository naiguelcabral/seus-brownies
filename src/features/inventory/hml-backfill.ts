export const hmlFifoSalePrefixes = [
  'HML-20260829-VENDA-01',
  'HML-20260829-VENDA-CORRECAO-01',
] as const

export type HmlFifoSale = {
  saleId: number
  prefix: string
  status: string
  itemId: number
  productId: number
  sku: string
  quantity: string
  unitPrice: string
  totalAmount: string
  movementId: number
  movementQuantity: string
  movementAllocatedCost: string | null
}

export type HmlFifoLayer = {
  id: number
  productionBatchId: number
  productId: number
  sku: string
  originalQuantity: string
  originalCost: string
  remainingQuantity: string
  remainingCost: string
}

export type HmlFifoAllocation = {
  saleItemId: number | null
  outgoingStockMovementId: number
  quantity: string
  allocatedCost: string
}

export function planHmlFifoBackfill(input: {
  candidate: Omit<HmlFifoLayer, 'id' | 'remainingQuantity' | 'remainingCost'>
  layer: HmlFifoLayer | null
  sales: HmlFifoSale[]
  allocations: HmlFifoAllocation[]
}) {
  const expectedPrefixes = new Set(hmlFifoSalePrefixes)
  if (
    input.sales.length !== 2 ||
    new Set(input.sales.map((sale) => sale.prefix)).size !== 2 ||
    input.sales.some((sale) => !expectedPrefixes.has(sale.prefix as never))
  )
    throw new Error('Backfill HML requer exatamente as duas vendas autorizadas.')
  if (
    input.sales.some(
      (sale) =>
        !['confirmed', 'paid'].includes(sale.status) ||
        sale.sku !== 'PROD003' ||
        sale.quantity !== '1.000' ||
        sale.unitPrice !== '12.00' ||
        sale.totalAmount !== '12.00' ||
        sale.movementQuantity !== '-1.000' ||
        ![null, '3.78'].includes(sale.movementAllocatedCost),
    )
  )
    throw new Error('Backfill HML encontrou venda ou movimento divergente.')
  const source = input.layer ?? input.candidate
  if (
    source.productionBatchId !== 18 ||
    source.sku !== 'PROD003' ||
    source.originalQuantity !== '12.000' ||
    source.originalCost !== '45.33'
  )
    throw new Error('Backfill HML encontrou camada de produção divergente.')

  if (!input.allocations.length) {
    return {
      action: 'create' as const,
      allocations: input.sales
        .slice()
        .sort((left, right) => left.saleId - right.saleId)
        .map((sale) => ({
          saleItemId: sale.itemId,
          outgoingStockMovementId: sale.movementId,
          productId: sale.productId,
          quantity: '1.000',
          allocatedCost: '3.78',
          unitCost: '3.780',
        })),
      remainingQuantity: '10.000',
      remainingCost: '37.77',
    }
  }

  if (!input.layer)
    throw new Error('Backfill HML encontrou alocação sem camada correspondente.')

  if (
    input.allocations.length !== 2 ||
    input.allocations.some(
      (allocation) =>
        allocation.quantity !== '1.000' || allocation.allocatedCost !== '3.78',
    ) ||
    input.layer.remainingQuantity !== '10.000' ||
    input.layer.remainingCost !== '37.77'
  )
    throw new Error('Backfill HML encontrou alocações parciais ou divergentes.')

  return {
    action: 'noop' as const,
    allocations: [],
    remainingQuantity: '10.000',
    remainingCost: '37.77',
  }
}
