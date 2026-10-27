import { z } from 'zod'
import { purchaseInput } from './input'
import { requireDefined } from '../../lib/required-value'

export const maxPurchaseBatchBytes = 64 * 1024
const positiveDecimal = (places: number) =>
  z
    .string()
    .max(24)
    .regex(new RegExp(`^\\d+(?:[.,]\\d{1,${places}})?$`))
    .refine((value) => Number(value.replace(',', '.')) > 0)
const productShape = {
  key: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(120),
  sku: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/),
  type: z.enum(['ingredient', 'packaging']),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'm', 'unit']),
}
const batchProduct = z.discriminatedUnion('kind', [
  z
    .object({
      ...productShape,
      kind: z.literal('existing'),
      id: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      ...productShape,
      kind: z.literal('new'),
      categoryId: z.number().int().positive(),
      categoryName: z.string().min(2).max(80),
      description: z.string().trim().max(1000),
    })
    .strict(),
])
const batchSchema = z
  .object({
    version: z.literal(1),
    targetOrigin: z.string().url(),
    products: z.array(batchProduct).min(1).max(30),
    purchases: z
      .array(
        z
          .object({
            idempotencyKey: z.string().uuid(),
            supplierName: z.string().trim().min(2).max(160),
            purchasedAt: z.string().date(),
            invoiceFileReference: z.string().trim().min(1).max(500),
            notes: z.string().trim().max(1000),
            items: z
              .array(
                z
                  .object({
                    productKey: z.string().min(1).max(64),
                    quantity: positiveDecimal(3),
                    totalAmount: positiveDecimal(2),
                    purchaseUnit: z.literal('kg').optional(),
                    supplierLot: z.string().trim().max(80).optional(),
                    expiresOn: z.string().date().optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(100),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict()

export type PurchaseBatch = z.infer<typeof batchSchema>
type BatchProduct = PurchaseBatch['products'][number]
type CatalogProduct = {
  id: number
  name: string
  sku: string
  type: string
  unit: string
  isActive: boolean
  categoryId: number | null
  description: string | null
}
export type PurchaseBatchPorts = {
  findProducts: (sku: string) => Promise<CatalogProduct[]>
  listCategories: () => Promise<
    { id: number; name: string; isActive: boolean }[]
  >
  createProduct: (data: {
    name: string
    sku: string
    type: 'ingredient' | 'packaging'
    unit: BatchProduct['unit']
    categoryId: number
    description: string
  }) => Promise<{ id: number }>
  createPurchase: (
    data: z.infer<typeof purchaseInput>,
  ) => Promise<{ id: number; replayed: boolean }>
}

export function batchMoneyCents(value: string) {
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  return BigInt(requireDefined(whole)) * 100n + BigInt(fraction.padEnd(2, '0'))
}
export function purchaseBatchTotal(batch: PurchaseBatch) {
  return batch.purchases.reduce(
    (total, purchase) =>
      total +
      purchase.items.reduce(
        (subtotal, item) => subtotal + batchMoneyCents(item.totalAmount),
        0n,
      ),
    0n,
  )
}

export function parsePurchaseBatch(text: string, origin: string) {
  if (new TextEncoder().encode(text).length > maxPurchaseBatchBytes) {
    throw new Error('O lote excede o limite de 64 KB.')
  }
  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    throw new Error('Arquivo de lote inválido. Confira o conteúdo preparado.')
  }
  const parsed = batchSchema.safeParse(input)
  if (!parsed.success)
    throw new Error('Formato de lote inválido. Confira o arquivo preparado.')
  const batch = parsed.data
  if (batch.targetOrigin !== origin)
    throw new Error('Este lote foi preparado para outro ambiente.')
  const keys = new Set(batch.products.map((product) => product.key))
  if (
    keys.size !== batch.products.length ||
    new Set(batch.products.map((product) => product.sku)).size !==
      batch.products.length ||
    new Set(batch.purchases.map((purchase) => purchase.idempotencyKey)).size !==
      batch.purchases.length ||
    new Set(batch.purchases.map((purchase) => purchase.invoiceFileReference))
      .size !== batch.purchases.length
  ) {
    throw new Error('O lote contém produtos ou referências repetidos.')
  }
  const used = new Set<string>()
  for (const purchase of batch.purchases) {
    for (const item of purchase.items) {
      const product = batch.products.find(
        (candidate) => candidate.key === item.productKey,
      )
      if (!product) throw new Error('Um item não tem produto definido no lote.')
      used.add(product.key)
      if (
        (product.unit === 'g' || product.unit === 'kg') !==
        (item.purchaseUnit === 'kg')
      ) {
        throw new Error(
          'Compras de massa exigem kg; os demais itens usam sua unidade de estoque.',
        )
      }
      if (item.expiresOn && item.expiresOn < purchase.purchasedAt) {
        throw new Error('A validade não pode ser anterior à compra.')
      }
      if (product.unit === 'unit' && !/^\d+$/.test(item.quantity)) {
        throw new Error('Itens em unidades exigem quantidades inteiras.')
      }
    }
  }
  if (used.size !== keys.size)
    throw new Error('Há produtos sem compra no lote.')
  return batch
}

/** Fragment data is read only after the user opens the importer; never a command. */
export function decodePurchaseBatchFragment(hash: string) {
  if (!hash.startsWith('#lote=')) return ''
  const encoded = hash.slice(6)
  if (
    encoded.length > maxPurchaseBatchBytes * 2 ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  ) {
    throw new Error('Link de lote inválido ou muito grande.')
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(
      atob(encoded.replaceAll('-', '+').replaceAll('_', '/')),
      (character) => character.charCodeAt(0),
    ),
  )
}

/** Read-only preflight. All writes below still use the existing guarded RPCs. */
export async function preparePurchaseBatch(
  batch: PurchaseBatch,
  ports: PurchaseBatchPorts,
) {
  const resolved = new Map<string, number>()
  const missing: Extract<BatchProduct, { kind: 'new' }>[] = []
  for (const product of batch.products) {
    const rows = (await ports.findProducts(product.sku)).filter(
      (row) => row.sku === product.sku,
    )
    const current = rows.at(0)
    if (rows.length > 1) throw new Error(`SKU ambíguo: ${product.sku}.`)
    if (!current) {
      if (product.kind === 'existing')
        throw new Error(`Produto ausente: ${product.name}.`)
      missing.push(product)
      continue
    }
    if (
      !current.isActive ||
      current.name !== product.name ||
      current.type !== product.type ||
      current.unit !== product.unit ||
      (product.kind === 'existing' && current.id !== product.id) ||
      (product.kind === 'new' &&
        (current.categoryId !== product.categoryId ||
          (current.description ?? '') !== product.description))
    ) {
      throw new Error(
        `O cadastro de ${product.name} diverge do lote. Revise antes de incluir.`,
      )
    }
    resolved.set(product.key, current.id)
  }
  if (missing.length) {
    const categories = await ports.listCategories()
    for (const product of missing) {
      if (
        !categories.some(
          (category) =>
            category.id === product.categoryId &&
            category.name === product.categoryName &&
            category.isActive,
        )
      ) {
        throw new Error(`Categoria indisponível para ${product.name}.`)
      }
    }
  }
  return { resolved, missing }
}

export async function runPurchaseBatch(
  batch: PurchaseBatch,
  ports: PurchaseBatchPorts,
  onPurchase: (result: {
    index: number
    id: number
    replayed: boolean
  }) => void,
) {
  // Refresh the entire preflight before the first mutation. A lost response is
  // recovered by reopening the same manifest: SKU and purchase UUIDs stay fixed.
  const { resolved, missing } = await preparePurchaseBatch(batch, ports)
  for (const product of missing) {
    const created = await ports.createProduct({
      name: product.name,
      sku: product.sku,
      type: product.type,
      unit: product.unit,
      categoryId: product.categoryId,
      description: product.description,
    })
    resolved.set(product.key, created.id)
  }
  for (const [index, purchase] of batch.purchases.entries()) {
    const result = await ports.createPurchase(
      purchaseInput.parse({
        ...purchase,
        items: purchase.items.map(({ productKey, ...item }) => ({
          ...item,
          productId: requireDefined(resolved.get(productKey)),
        })),
      }),
    )
    onPurchase({ index, ...result })
  }
}
