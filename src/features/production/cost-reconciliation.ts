import {
  moneyToCents,
  quantityToThousandths,
} from '#/features/production/calculations'

type Output = {
  id: number
  productId: number
  actualQuantity: string | null
  allocatedCost: string | null
}
type Layer = {
  id: number
  productionBatchOutputId: number | null
  productId: number
  originalQuantity: string
  originalCost: string
}
export type ProductionCostDivergence = {
  code:
    | 'missing_outputs'
    | 'invalid_batch_cost'
    | 'invalid_output_fact'
    | 'invalid_layer_fact'
    | 'allocation_total_mismatch'
    | 'missing_fifo_layer'
    | 'layer_product_mismatch'
    | 'layer_quantity_mismatch'
    | 'layer_cost_mismatch'
  outputId: number | null
  layerId: number | null
}

export const productionCostDivergenceMessages: Record<
  ProductionCostDivergence['code'],
  string
> = {
  missing_outputs: 'Lote sem saídas registradas',
  invalid_batch_cost: 'Custo total ausente ou inválido',
  invalid_output_fact:
    'Quantidade ou custo alocado da saída ausente ou inválido',
  invalid_layer_fact: 'Quantidade ou custo original da camada inválido',
  allocation_total_mismatch:
    'Custos alocados não fecham com o custo total do lote',
  missing_fifo_layer: 'Saída sem camada FIFO vinculada',
  layer_product_mismatch: 'Produto da camada difere do produto da saída',
  layer_quantity_mismatch: 'Quantidade original FIFO difere da saída realizada',
  layer_cost_mismatch: 'Custo original FIFO difere do custo alocado da saída',
}

/** Compares immutable recorded origins; remaining FIFO balances are not inputs. */
export function reconcileProductionCosts(
  totalCost: string | null,
  outputs: Output[],
  layers: Layer[],
) {
  const divergences: ProductionCostDivergence[] = []
  const add = (
    code: ProductionCostDivergence['code'],
    outputId: number | null = null,
    layerId: number | null = null,
  ) => {
    divergences.push({ code, outputId, layerId })
  }
  const batchCost = moneyToCents(totalCost)
  if (batchCost === null) add('invalid_batch_cost')
  if (outputs.length === 0) add('missing_outputs')
  const byOutput = new Map(
    layers.map((layer) => [layer.productionBatchOutputId, layer]),
  )
  let allocated = 0n
  let allOutputCostsValid = true
  for (const output of outputs) {
    const quantity =
      output.actualQuantity === null
        ? null
        : quantityToThousandths(output.actualQuantity)
    const cost = moneyToCents(output.allocatedCost)
    if (quantity === null || cost === null)
      add('invalid_output_fact', output.id)
    if (cost === null) allOutputCostsValid = false
    else allocated += cost
    const layer = byOutput.get(output.id)
    if (!layer) {
      add('missing_fifo_layer', output.id)
      continue
    }
    if (layer.productId !== output.productId)
      add('layer_product_mismatch', output.id, layer.id)
    const layerQuantity = quantityToThousandths(layer.originalQuantity)
    const layerCost = moneyToCents(layer.originalCost)
    if (layerQuantity === null || layerCost === null)
      add('invalid_layer_fact', output.id, layer.id)
    if (
      quantity !== null &&
      layerQuantity !== null &&
      quantity !== layerQuantity
    )
      add('layer_quantity_mismatch', output.id, layer.id)
    if (cost !== null && layerCost !== null && cost !== layerCost)
      add('layer_cost_mismatch', output.id, layer.id)
  }
  if (batchCost !== null && allOutputCostsValid && allocated !== batchCost)
    add('allocation_total_mismatch')
  return divergences
}
