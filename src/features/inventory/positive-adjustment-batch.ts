import { z } from 'zod'
import { positiveInventoryValues } from './lifecycle-contracts'
import { inventoryEventSourceKey } from './lifecycle'
import { moneyToCents, quantityToThousandths } from '../production/calculations'
import { exactCost, readExactCost } from '../../lib/exact-cost'
import type { ExactCost } from '../../lib/exact-cost'
import { requireDefined } from '../../lib/required-value'

export const maxAdjustmentBatchBytes = 32 * 1024
const itemSchema = positiveInventoryValues
  .extend({
    sku: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(120),
    unit: z.enum(['g', 'kg', 'ml', 'l', 'm', 'unit']),
  })
  .strict()
  .refine((item) => {
    const quantity = quantityToThousandths(item.quantity)
    const cost = moneyToCents(item.totalCost)
    return (
      quantity !== null &&
      quantity > 0n &&
      cost !== null &&
      cost >= 0n &&
      (item.unit !== 'unit' || quantity % 1000n === 0n) &&
      inventoryEventSourceKey(
        'adjustment-positive',
        item.productId,
        item.reference,
      ).length <= 160
    )
  })

export const positiveAdjustmentBatchSchema = z
  .object({
    version: z.literal(1),
    targetOrigin: z
      .string()
      .url()
      .max(2000)
      .refine((value) => {
        try {
          const url = new URL(value)
          return (
            ['http:', 'https:'].includes(url.protocol) && url.origin === value
          )
        } catch {
          return false
        }
      }),
    adjustments: z.array(itemSchema).min(1).max(10),
  })
  .strict()
  .refine(
    (batch) =>
      new Set(batch.adjustments.map((item) => item.reference)).size ===
        batch.adjustments.length &&
      new Set(batch.adjustments.map((item) => item.productId)).size ===
        batch.adjustments.length &&
      new Set(batch.adjustments.map((item) => item.sku)).size ===
        batch.adjustments.length,
  )

export type PositiveAdjustmentBatch = z.infer<
  typeof positiveAdjustmentBatchSchema
>
export type AdjustmentBatchPreview = {
  items: { index: number; reference: string; movementId: number | null }[]
}
type BatchProduct = {
  id: number
  name: string
  sku: string
  unit: string
  isActive: boolean
}
type PriorAdjustment = {
  id: number
  productId: number
  sourceKey: string | null
  referenceType: string | null
  quantityDelta: string
  allocatedCost: string | null
  exactCost: ExactCost | null
  notes: string | null
}

export function adjustmentMoneyCents(value: string) {
  const cents = moneyToCents(value)
  if (cents === null) throw new Error('Custo inválido.')
  return cents
}

export function parsePositiveAdjustmentBatch(text: string, origin: string) {
  if (new TextEncoder().encode(text).length > maxAdjustmentBatchBytes)
    throw new Error('O lote excede o limite de 32 KB.')
  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    throw new Error('Dados de ajustes inválidos.')
  }
  const parsed = positiveAdjustmentBatchSchema.safeParse(input)
  if (!parsed.success)
    throw new Error(
      'Revise os dados, unidades e referências do lote de ajustes.',
    )
  if (parsed.data.targetOrigin !== origin)
    throw new Error('Este lote foi preparado para outro ambiente.')
  return parsed.data
}

export function decodeAdjustmentBatchFragment(hash: string) {
  if (!hash.startsWith('#ajustes=')) return ''
  const encoded = hash.slice(9)
  if (
    encoded.length > maxAdjustmentBatchBytes * 2 ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  )
    throw new Error('Link de ajustes inválido ou muito grande.')
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(
      atob(encoded.replaceAll('-', '+').replaceAll('_', '/')),
      (character) => character.charCodeAt(0),
    ),
  )
}

/** Receipts are read from the database; the browser never supplies replay flags. */
export function previewPositiveAdjustmentBatch(
  batch: PositiveAdjustmentBatch,
  products: BatchProduct[],
  movements: PriorAdjustment[],
): AdjustmentBatchPreview {
  return {
    items: batch.adjustments.map((item, index) => {
      const matches = products.filter(
        (product) => product.id === item.productId,
      )
      const product = matches.at(0)
      if (
        matches.length !== 1 ||
        !product ||
        !product.isActive ||
        product.sku !== item.sku ||
        product.name !== item.name ||
        product.unit !== item.unit
      )
        throw new Error(
          `O cadastro de ${item.name} diverge do lote. Revise antes de incluir.`,
        )
      const key = inventoryEventSourceKey(
        'adjustment-positive',
        item.productId,
        item.reference,
      )
      const receipts = movements.filter(
        (movement) => movement.sourceKey === key,
      )
      const receipt = receipts.at(0)
      if (!receipt)
        return { index, reference: item.reference, movementId: null }
      const cost = exactCost(adjustmentMoneyCents(item.totalCost), 100n)
      const priorCost = receipt.exactCost && readExactCost(receipt.exactCost)
      if (
        receipts.length !== 1 ||
        receipt.productId !== item.productId ||
        receipt.referenceType !== 'adjustment_positive' ||
        quantityToThousandths(receipt.quantityDelta) !==
          quantityToThousandths(item.quantity) ||
        moneyToCents(receipt.allocatedCost) !== moneyToCents(item.totalCost) ||
        !priorCost ||
        priorCost.numerator !== cost.numerator ||
        priorCost.denominator !== cost.denominator ||
        receipt.notes !== `${item.reason} | origem: ${item.originReference}`
      )
        throw new Error(
          `A referência ${item.reference} já existe com dados diferentes. Interrompa e confira o histórico.`,
        )
      return { index, reference: item.reference, movementId: receipt.id }
    }),
  }
}

export type AdjustmentBatchResult = {
  index: number
  movementId: number
  replayed: boolean
}
export type AdjustmentBatchPorts = {
  preview: (batch: PositiveAdjustmentBatch) => Promise<AdjustmentBatchPreview>
  record: (
    input: z.infer<typeof positiveInventoryValues>,
  ) => Promise<{ movementId: number; layerId: number }>
}

export async function runPositiveAdjustmentBatch(
  batch: PositiveAdjustmentBatch,
  ports: AdjustmentBatchPorts,
  onItem: (result: AdjustmentBatchResult) => void,
) {
  const preview = await ports.preview(batch)
  for (const [index, item] of batch.adjustments.entries()) {
    const prior = requireDefined(
      preview.items.find(
        (row) => row.index === index && row.reference === item.reference,
      ),
    )
    if (prior.movementId !== null) {
      onItem({ index, movementId: prior.movementId, replayed: true })
      continue
    }
    try {
      const result = await ports.record(positiveInventoryValues.parse(item))
      onItem({ index, movementId: result.movementId, replayed: false })
    } catch (error) {
      // A lost response or a concurrent insertion is resolved by a read, never by
      // issuing the same consumed reference again. A conflict remains blocking.
      const after = await ports.preview(batch)
      const receipt = after.items.find(
        (row) => row.index === index && row.reference === item.reference,
      )
      if (receipt?.movementId == null) throw error
      onItem({ index, movementId: receipt.movementId, replayed: true })
    }
  }
}
