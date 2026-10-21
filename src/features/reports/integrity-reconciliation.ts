import type { ExactCost } from '#/lib/exact-cost'
import { diagnoseDeliveryFifoCoverage } from '#/features/finance/delivery-fifo-coverage'
import type {
  DeliveryFifoCoverageInput,
  DeliveryFifoDivergence,
} from '#/features/finance/delivery-fifo-coverage'
import {
  productionCostDivergenceMessages,
  reconcileProductionCosts,
} from '#/features/production/cost-reconciliation'
import type { ProductionCostDivergence } from '#/features/production/cost-reconciliation'
import { reconcileInventoryLedger } from './inventory-reconciliation'
import type {
  ReconciliationDivergence,
  ReconciliationInput,
} from './inventory-reconciliation'

export type IntegrityDivergence = {
  area: 'estoque' | 'produção' | 'cmv'
  code: string
  entityType: string
  entityId: number | null
  relatedIds: number[]
  message: string
  expected?: string
  actual?: string
}

type IntegrityProductionBatch = {
  id: number
  totalCost: string | null
  exactCost?: ExactCost | null
  outputs: Array<{
    id: number
    productId: number
    actualQuantity: string | null
    allocatedCost: string | null
    exactCost?: ExactCost | null
  }>
  layers: Array<{
    id: number
    productionBatchOutputId: number | null
    productId: number
    originalQuantity: string
    originalCost: string
    exactOriginalCost?: ExactCost | null
  }>
}

export type IntegrityReconciliationInput = {
  ledger: ReconciliationInput
  production: IntegrityProductionBatch[]
  deliveries: DeliveryFifoCoverageInput
}

const ledgerMessages: Record<ReconciliationDivergence['code'], string> = {
  layer_quantity_mismatch: 'Saldo da camada FIFO diverge das alocações.',
  layer_cost_mismatch: 'Custo da camada FIFO diverge das alocações.',
  outgoing_movement_quantity_mismatch:
    'Saída de estoque diverge da quantidade alocada no FIFO.',
  outgoing_movement_cost_mismatch:
    'Saída de estoque diverge do custo alocado no FIFO.',
  reversal_movement_quantity_mismatch:
    'Reversão de estoque diverge da quantidade restaurada.',
  reversal_movement_cost_mismatch:
    'Reversão de estoque diverge do custo restaurado.',
  product_mismatch: 'Os produtos vinculados não coincidem.',
  missing_layer: 'Alocação aponta para uma camada FIFO ausente.',
  missing_allocation: 'Reversão aponta para uma alocação FIFO ausente.',
  reversal_quantity_exceeds_allocation:
    'As reversões superam a quantidade originalmente alocada.',
  reversal_cost_exceeds_allocation:
    'As reversões superam o custo originalmente alocado.',
  invalid_decimal: 'Quantidade ou custo registrado é inválido.',
}

const deliveryMessages: Record<DeliveryFifoDivergence['code'], string> = {
  missing_items: 'Entrega sem itens para apurar o CMV.',
  missing_allocation: 'Item entregue sem alocação FIFO para apurar o CMV.',
  quantity_mismatch:
    'Quantidade entregue diverge da quantidade coberta pelas alocações FIFO.',
  invalid_quantity: 'Quantidade de item ou alocação é inválida.',
  missing_sale_reference: 'Receita de entrega não aponta para uma venda.',
}

function ledgerDivergence(item: ReconciliationDivergence): IntegrityDivergence {
  return {
    area: 'estoque',
    code: item.code,
    entityType: item.entityType,
    entityId: item.entityId,
    relatedIds: item.relatedIds,
    message: ledgerMessages[item.code],
    expected: item.expected,
    actual: item.actual,
  }
}

function productionDivergence(
  batchId: number,
  item: ProductionCostDivergence,
): IntegrityDivergence {
  return {
    area: 'produção',
    code: item.code,
    entityType: 'lote',
    entityId: batchId,
    relatedIds: [item.outputId, item.layerId].filter(
      (id): id is number => id !== null,
    ),
    message: productionCostDivergenceMessages[item.code],
  }
}

function deliveryDivergence(item: DeliveryFifoDivergence): IntegrityDivergence {
  return {
    area: 'cmv',
    code: item.code,
    entityType: item.saleItemId === null ? 'venda' : 'item de venda',
    entityId: item.saleItemId ?? item.saleId,
    relatedIds: item.allocationIds,
    message: deliveryMessages[item.code],
  }
}

/**
 * Aggregates existing diagnostic facts only. This function never proposes or
 * performs a repair; missing facts remain explicit instead of becoming zero.
 */
export function reconcileOperationalIntegrity(
  input: IntegrityReconciliationInput,
) {
  const ledger = reconcileInventoryLedger(input.ledger)
  const production = input.production.flatMap((batch) =>
    reconcileProductionCosts(
      batch.totalCost,
      batch.outputs,
      batch.layers,
      batch.exactCost,
    ).map((item) => productionDivergence(batch.id, item)),
  )
  const deliveries = diagnoseDeliveryFifoCoverage(input.deliveries)
  const divergences = [
    ...ledger.divergences.map(ledgerDivergence),
    ...production,
    ...deliveries.divergences.map(deliveryDivergence),
  ].sort(
    (left, right) =>
      left.area.localeCompare(right.area, 'pt-BR') ||
      left.entityType.localeCompare(right.entityType, 'pt-BR') ||
      (left.entityId ?? Number.MAX_SAFE_INTEGER) -
        (right.entityId ?? Number.MAX_SAFE_INTEGER) ||
      left.code.localeCompare(right.code, 'pt-BR'),
  )

  return {
    complete: divergences.length === 0,
    checked: {
      ...ledger.checked,
      productionBatches: input.production.length,
      productionOutputs: input.production.reduce(
        (total, batch) => total + batch.outputs.length,
        0,
      ),
      deliveries: deliveries.checkedDeliveries,
      deliveryItems: deliveries.checkedItems,
    },
    divergences,
  }
}
