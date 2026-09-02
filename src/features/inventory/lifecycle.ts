import { allocateFifoCost, reverseFifoAllocations } from '#/features/inventory/fifo'
import type {
  InventoryCostLayer,
  ReversibleFifoAllocation,
} from '#/features/inventory/fifo'

export type LifecycleEvent =
  | 'sale_cancellation'
  | 'sale_return'
  | 'loss'
  | 'adjustment_negative'

/** Cancel and return use identical cost restoration; financial credit is separate. */
export function planStockRestoration(input: {
  event: 'sale_cancellation' | 'sale_return'
  layers: InventoryCostLayer[]
  allocations: ReversibleFifoAllocation[]
  quantities: Array<{ allocationId: number; quantity: bigint }>
}) {
  return reverseFifoAllocations(input.layers, input.allocations, input.quantities)
}

/** Losses and negative adjustments consume global FIFO, never create negative layers. */
export function planNegativeInventoryEvent(input: {
  event: 'loss' | 'adjustment_negative'
  reason: string
  reference: string
  layers: InventoryCostLayer[]
  productId: number
  quantity: bigint
}) {
  if (input.reason.trim().length < 3 || input.reference.trim().length < 1)
    throw new Error('Perda ou ajuste negativo exige motivo e referência.')
  return allocateFifoCost(input.layers, input.productId, input.quantity)
}

/** Positive adjustments must carry external total cost; zero is allowed only when explicit. */
export function assertPositiveAdjustment(input: {
  quantity: bigint
  totalCost: bigint
  sourceReference: string
}) {
  if (input.quantity <= 0n || input.totalCost < 0n || !input.sourceReference.trim())
    throw new Error('Ajuste positivo exige quantidade, custo de origem e referência.')
}
