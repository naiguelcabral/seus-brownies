import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import type { getDb } from '#/db/index'

import {
  operationalCostRates,
  operationalCosts,
  products,
  productionBatchConsumptions,
  productionBatchLosses,
  productionBatchOutputs,
  productionBatches,
  productionProfileComponents,
  productionProfiles,
  recipeItems,
  recipeOperationalRequirements,
  recipeVersions,
  stockMovements,
} from '#/db/schema'
import {
  calculateMoneyCents,
  calculateRecipeCapacity,
  calculateWeightedAverageCost,
  centsToMoney,
  moneyToCents,
  multiplyQuantities,
  quantityToThousandths,
  thousandthsToQuantity,
} from '#/features/production/calculations'

const quantityInput = z
  .string()
  .trim()
  .refine(
    (value) => (quantityToThousandths(value) ?? 0n) > 0n,
    'Informe uma quantidade positiva com até três casas decimais.',
  )

const outputInput = z.object({
  productId: z.number().int().positive(),
  quantity: quantityInput,
})

const lossInput = z.object({
  productId: z.number().int().positive(),
  quantity: quantityInput,
  reason: z.string().trim().min(3, 'Informe o motivo da perda.').max(240),
})

const batchInput = z.object({
  recipeVersionId: z.number().int().positive(),
  productionDate: z.string().date(),
  recipeMultiplier: quantityInput,
  outputs: z.array(outputInput).min(1, 'Inclua ao menos um produto final.'),
  bordinhasQuantity: z.string().trim().optional(),
  losses: z.array(lossInput).default([]),
  notes: z.string().trim().max(1_000).optional(),
})

type BatchInput = z.infer<typeof batchInput>
type Database = ReturnType<typeof getDb>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

type ProductWithUnit = {
  id: number
  sku: string
  name: string
  unit: 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'
  type: 'ingredient' | 'packaging' | 'finished_product'
}

type Consumption = ProductWithUnit & {
  quantity: bigint
  source: string[]
}

function requireQuantity(value: string, label: string) {
  const parsed = quantityToThousandths(value)
  if (parsed === null || parsed <= 0n) throw new Error(`${label} inválida.`)
  return parsed
}

function nonnegativeQuantity(value: string, label: string) {
  const parsed = quantityToThousandths(value)
  if (parsed === null || parsed < 0n) throw new Error(`${label} inválida.`)
  return parsed
}

function addConsumption(
  target: Map<number, Consumption>,
  product: ProductWithUnit,
  quantity: bigint,
  source: string,
) {
  const existing = target.get(product.id)
  if (existing) {
    if (existing.unit !== product.unit)
      throw new Error(`Unidade incompatível para ${product.name}.`)
    existing.quantity += quantity
    existing.source.push(source)
    return
  }
  target.set(product.id, { ...product, quantity, source: [source] })
}

async function loadPlan(tx: Transaction, input: BatchInput) {
  const [recipe] = await tx
    .select({
      id: recipeVersions.id,
      name: recipeVersions.name,
      status: recipeVersions.status,
      version: recipeVersions.version,
    })
    .from(recipeVersions)
    .where(eq(recipeVersions.id, input.recipeVersionId))
  if (recipe.status !== 'active')
    throw new Error('Selecione uma receita-base ativa.')

  const packaging = alias(products, 'production_packaging')
  const profileRows = await tx
    .select({
      id: productionProfiles.id,
      expectedYield: productionProfiles.expectedYield,
      packagingQuantity: productionProfiles.packagingQuantity,
      productId: products.id,
      productSku: products.sku,
      productName: products.name,
      productUnit: products.unit,
      productType: products.type,
      packagingId: packaging.id,
      packagingSku: packaging.sku,
      packagingName: packaging.name,
      packagingUnit: packaging.unit,
      packagingType: packaging.type,
    })
    .from(productionProfiles)
    .innerJoin(products, eq(productionProfiles.productId, products.id))
    .leftJoin(packaging, eq(productionProfiles.packagingProductId, packaging.id))
    .where(eq(productionProfiles.recipeVersionId, recipe.id))

  const bordinhasProfile = profileRows.find(
    (profile) =>
      profile.productSku === 'PROD002' && profile.productName === 'Bordinhas',
  )
  if (!bordinhasProfile)
    throw new Error('O perfil de Bordinhas da receita-base não foi encontrado.')

  const outputIds = input.outputs.map((output) => output.productId)
  if (new Set(outputIds).size !== outputIds.length)
    throw new Error('Não repita o mesmo produto nas saídas do lote.')
  if (outputIds.includes(bordinhasProfile.productId))
    throw new Error('Bordinhas deve ser informada no campo próprio do coproduto.')

  const profileByProductId = new Map(
    profileRows.map((profile) => [profile.productId, profile]),
  )
  const selectedProfiles = input.outputs.map((output) => {
    const profile = profileByProductId.get(output.productId)
    if (!profile || profile.productType !== 'finished_product')
      throw new Error('Uma saída não pertence à receita-base selecionada.')
    return { output, profile }
  })

  const lossByProductId = new Map<number, bigint>()
  for (const loss of input.losses) {
    if (lossByProductId.has(loss.productId))
      throw new Error('Agrupe cada perda em uma única linha por produto.')
    if (!outputIds.includes(loss.productId) && loss.productId !== bordinhasProfile.productId)
      throw new Error('A perda deve se referir a uma saída deste lote.')
    lossByProductId.set(loss.productId, requireQuantity(loss.quantity, 'Quantidade de perda'))
  }

  const capacityOutputs = selectedProfiles.map(({ output, profile }) => {
    const sellable = requireQuantity(output.quantity, 'Quantidade de saída')
    const loss = lossByProductId.get(output.productId) ?? 0n
    return {
      productId: output.productId,
      quantity: thousandthsToQuantity(sellable + loss),
      expectedYield: profile.expectedYield,
    }
  })
  const capacity = calculateRecipeCapacity(
    input.recipeMultiplier,
    capacityOutputs,
    bordinhasProfile.expectedYield,
  )
  if (capacity.overCapacity)
    throw new Error(
      `Os produtos ocupam ${capacity.occupied} receitas, acima do multiplicador de ${capacity.multiplier}.`,
    )

  const suggestedBordinhas = nonnegativeQuantity(
    capacity.suggestedBordinhas,
    'Capacidade de Bordinhas',
  )
  const bordinhasQuantity = input.bordinhasQuantity
    ? nonnegativeQuantity(input.bordinhasQuantity, 'Quantidade de Bordinhas')
    : suggestedBordinhas
  const bordinhasLoss = lossByProductId.get(bordinhasProfile.productId) ?? 0n
  if (bordinhasQuantity + bordinhasLoss !== suggestedBordinhas) {
    throw new Error(
      'Bordinhas deve corresponder ao saldo calculado. Se houver diferença, registre-a como perda manual com motivo.',
    )
  }

  const baseRows = await tx
    .select({
      id: recipeItems.id,
      quantity: recipeItems.quantity,
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      type: products.type,
    })
    .from(recipeItems)
    .innerJoin(products, eq(recipeItems.productId, products.id))
    .where(eq(recipeItems.recipeVersionId, recipe.id))
  if (!baseRows.length) throw new Error('A receita-base não possui itens físicos.')

  const components = await tx
    .select({
      profileId: productionProfileComponents.productionProfileId,
      quantity: productionProfileComponents.quantity,
      productId: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      type: products.type,
    })
    .from(productionProfileComponents)
    .innerJoin(products, eq(productionProfileComponents.productId, products.id))
    .where(
      inArray(
        productionProfileComponents.productionProfileId,
        selectedProfiles.map(({ profile }) => profile.id),
      ),
    )

  const multiplier = requireQuantity(input.recipeMultiplier, 'Multiplicador')
  const consumptions = new Map<number, Consumption>()
  for (const item of baseRows) {
    if (item.type === 'finished_product')
      throw new Error(`Item de receita inválido: ${item.name}.`)
    addConsumption(
      consumptions,
      item,
      multiplyQuantities(requireQuantity(item.quantity, 'Quantidade de receita'), multiplier),
      'receita-base',
    )
  }
  const componentsByProfile = new Map<number, typeof components>()
  for (const component of components) {
    const group = componentsByProfile.get(component.profileId) ?? []
    group.push(component)
    componentsByProfile.set(component.profileId, group)
  }
  for (const { output, profile } of selectedProfiles) {
    const grossQuantity =
      requireQuantity(output.quantity, 'Quantidade de saída') +
      (lossByProductId.get(output.productId) ?? 0n)
    for (const component of componentsByProfile.get(profile.id) ?? []) {
      if (component.type === 'finished_product')
        throw new Error(`Componente de perfil inválido: ${component.name}.`)
      addConsumption(
        consumptions,
        component,
        multiplyQuantities(
          requireQuantity(component.quantity, 'Quantidade de componente'),
          grossQuantity,
        ),
        'recheio',
      )
    }
    if (profile.packagingId && profile.packagingQuantity) {
      if (profile.packagingType !== 'packaging' || !profile.packagingUnit || !profile.packagingSku || !profile.packagingName)
        throw new Error('A embalagem do perfil está incompatível com o catálogo.')
      addConsumption(
        consumptions,
        {
          id: profile.packagingId,
          sku: profile.packagingSku,
          name: profile.packagingName,
          unit: profile.packagingUnit,
          type: profile.packagingType,
        },
        multiplyQuantities(
          requireQuantity(profile.packagingQuantity, 'Quantidade de embalagem'),
          grossQuantity,
        ),
        'embalagem individual',
      )
    }
  }

  const requirements = await tx
    .select()
    .from(recipeOperationalRequirements)
    .where(eq(recipeOperationalRequirements.recipeVersionId, recipe.id))
  const rateRows = await tx
    .select()
    .from(operationalCostRates)
    .where(lte(operationalCostRates.effectiveFrom, input.productionDate))
    .orderBy(desc(operationalCostRates.effectiveFrom), desc(operationalCostRates.id))
  const rateByType = new Map<string, (typeof rateRows)[number]>()
  for (const rate of rateRows) if (!rateByType.has(rate.type)) rateByType.set(rate.type, rate)
  const operational = requirements.map((requirement) => {
    const rate = rateByType.get(requirement.type)
    if (!rate) throw new Error(`Não há tarifa vigente para ${requirement.type === 'energy' ? 'energia' : 'mão de obra'} na data do lote.`)
    const amount = requireQuantity(requirement.quantity, 'Quantidade operacional')
    const rateCents = moneyToCents(rate.unitAmount)
    if (rateCents === null) throw new Error('Tarifa operacional inválida.')
    const quantity = multiplyQuantities(amount, multiplier)
    return { requirement, rate, quantity, amountCents: calculateMoneyCents(rateCents, quantity) }
  })
  if (operational.length !== 2 || !rateByType.has('energy') || !rateByType.has('labor'))
    throw new Error('A receita ativa precisa de energia, mão de obra e tarifas vigentes.')

  const sellableOutputs = selectedProfiles.map(({ output, profile }) => ({
    product: {
      id: profile.productId,
      sku: profile.productSku,
      name: profile.productName,
      unit: profile.productUnit,
      type: profile.productType,
    },
    quantity: requireQuantity(output.quantity, 'Quantidade de saída'),
    role: 'primary' as const,
  }))
  if (bordinhasQuantity > 0n) {
    sellableOutputs.push({
      product: {
        id: bordinhasProfile.productId,
        sku: bordinhasProfile.productSku,
        name: bordinhasProfile.productName,
        unit: bordinhasProfile.productUnit,
        type: bordinhasProfile.productType,
      },
      quantity: bordinhasQuantity,
      role: 'co_product' as const,
    })
  }

  return {
    recipe,
    capacity,
    bordinhas: {
      productId: bordinhasProfile.productId,
      suggested: thousandthsToQuantity(suggestedBordinhas),
      selected: thousandthsToQuantity(bordinhasQuantity),
    },
    selectedProfiles,
    baseRows,
    consumptions: [...consumptions.values()],
    operational,
    sellableOutputs,
    lossByProductId,
  }
}

async function enrichCosts(tx: Transaction, plan: Awaited<ReturnType<typeof loadPlan>>) {
  const ids = plan.consumptions.map((item) => item.id)
  const movements = ids.length
    ? await tx
        .select({
          productId: stockMovements.productId,
          quantityDelta: stockMovements.quantityDelta,
          unitCost: stockMovements.unitCost,
        })
        .from(stockMovements)
        .where(inArray(stockMovements.productId, ids))
        .orderBy(asc(stockMovements.occurredAt), asc(stockMovements.id))
    : []
  const movementsByProduct = new Map<number, typeof movements>()
  for (const movement of movements) {
    const group = movementsByProduct.get(movement.productId) ?? []
    group.push(movement)
    movementsByProduct.set(movement.productId, group)
  }
  const costs = plan.consumptions.map((consumption) => {
    const unitCost = calculateWeightedAverageCost(
      movementsByProduct.get(consumption.id) ?? [],
    )
    return {
      ...consumption,
      available: (movementsByProduct.get(consumption.id) ?? []).reduce(
        (sum, movement) => sum + (quantityToThousandths(movement.quantityDelta) ?? 0n),
        0n,
      ),
      unitCost,
      totalCost: calculateMoneyCents(unitCost, consumption.quantity),
    }
  })
  const operationalTotal = plan.operational.reduce(
    (sum, item) => sum + item.amountCents,
    0n,
  )
  const ingredientTotal = costs.reduce((sum, item) => sum + item.totalCost, 0n)
  const totalCost = ingredientTotal + operationalTotal
  const grossQuantity =
    plan.sellableOutputs.reduce((sum, output) => sum + output.quantity, 0n) +
    [...plan.lossByProductId.values()].reduce((sum, quantity) => sum + quantity, 0n)
  if (grossQuantity <= 0n) throw new Error('O lote não possui saídas para calcular o custo.')
  const outputUnitCost = (totalCost * 1_000n + grossQuantity / 2n) / grossQuantity
  return { costs, ingredientTotal, operationalTotal, totalCost, grossQuantity, outputUnitCost }
}

function previewFromPlan(
  plan: Awaited<ReturnType<typeof loadPlan>>,
  costs: Awaited<ReturnType<typeof enrichCosts>>,
) {
  return {
    recipe: plan.recipe,
    capacity: plan.capacity,
    bordinhas: plan.bordinhas,
    consumptions: costs.costs.map((item) => ({
      productId: item.id,
      productName: item.name,
      sku: item.sku,
      quantity: thousandthsToQuantity(item.quantity),
      available: thousandthsToQuantity(item.available),
      unit: item.unit,
      unitCost: centsToMoney(item.unitCost),
      totalCost: centsToMoney(item.totalCost),
      sufficient: item.available >= item.quantity,
      source: item.source,
    })),
    operational: plan.operational.map((item) => ({
      type: item.requirement.type,
      quantity: thousandthsToQuantity(item.quantity),
      unit: item.requirement.unit,
      rate: item.rate.unitAmount,
      effectiveFrom: item.rate.effectiveFrom,
      amount: centsToMoney(item.amountCents),
    })),
    outputs: plan.sellableOutputs.map((output) => ({
      productId: output.product.id,
      productName: output.product.name,
      quantity: thousandthsToQuantity(output.quantity),
      unit: output.product.unit,
      role: output.role,
    })),
    totalCost: centsToMoney(costs.totalCost),
    unitCost: centsToMoney(costs.outputUnitCost),
  }
}

export const getProductionWorkspace = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const [recipes, profileRows, batches] = await Promise.all([
      database
        .select({ id: recipeVersions.id, name: recipeVersions.name, version: recipeVersions.version })
        .from(recipeVersions)
        .where(eq(recipeVersions.status, 'active'))
        .orderBy(desc(recipeVersions.version)),
      database
        .select({
          recipeVersionId: productionProfiles.recipeVersionId,
          productId: products.id,
          sku: products.sku,
          name: products.name,
          expectedYield: productionProfiles.expectedYield,
          packagingName: sql<string | null>`null`,
        })
        .from(productionProfiles)
        .innerJoin(products, eq(productionProfiles.productId, products.id))
        .orderBy(asc(products.name)),
      database
        .select({
          id: productionBatches.id,
          status: productionBatches.status,
          plannedFor: productionBatches.plannedFor,
          recipeMultiplier: productionBatches.recipeMultiplier,
          totalCost: productionBatches.totalCost,
          unitCost: productionBatches.unitCost,
          completedAt: productionBatches.completedAt,
          recipeName: recipeVersions.name,
          recipeVersion: recipeVersions.version,
        })
        .from(productionBatches)
        .leftJoin(recipeVersions, eq(productionBatches.recipeVersionId, recipeVersions.id))
        .where(sql`${productionBatches.sourceId} is null`)
        .orderBy(desc(productionBatches.createdAt))
        .limit(60),
    ])
    return { recipes, profiles: profileRows, batches }
  },
)

export const previewProductionBatch = createServerFn({ method: 'POST' })
  .validator(batchInput)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const plan = await loadPlan(tx, data)
      const costs = await enrichCosts(tx, plan)
      return previewFromPlan(plan, costs)
    })
  })

export const createProductionBatch = createServerFn({ method: 'POST' })
  .validator(batchInput)
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      const plan = await loadPlan(tx, data)
      const losses = data.losses.map((loss) => ({
        productId: loss.productId,
        quantity: requireQuantity(loss.quantity, 'Quantidade de perda'),
        reason: loss.reason.trim(),
      }))
      const [batch] = await tx
        .insert(productionBatches)
        .values({
          recipeVersionId: plan.recipe.id,
          status: 'draft',
          plannedFor: data.productionDate,
          recipeMultiplier: data.recipeMultiplier.trim().replace(',', '.'),
          plannedQuantity: plan.capacity.multiplier,
          sourcePayload: {
            origin: 'manual_production_draft',
            plannedAt: new Date().toISOString(),
            capacity: plan.capacity,
            losses: losses.map((loss) => ({
              productId: loss.productId,
              quantity: thousandthsToQuantity(loss.quantity),
              reason: loss.reason,
            })),
          },
          notes: data.notes?.trim() || null,
        })
        .returning({ id: productionBatches.id })
      await tx.insert(productionBatchOutputs).values(
        plan.sellableOutputs.map((output) => ({
          sourceKey: `manual:production-batch:${batch.id}:output:${output.product.id}`,
          sourceHash: `draft-${batch.id}-${output.product.id}`,
          productionBatchId: batch.id,
          productId: output.product.id,
          role: output.role,
          unit: output.product.unit,
          plannedQuantity: thousandthsToQuantity(output.quantity),
        })),
      )
      return { id: batch.id }
    })
  })

export const getProductionBatch = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    const database = getDb()
    const [batch] = await database
      .select({
        id: productionBatches.id,
        status: productionBatches.status,
        plannedFor: productionBatches.plannedFor,
        recipeMultiplier: productionBatches.recipeMultiplier,
        totalCost: productionBatches.totalCost,
        unitCost: productionBatches.unitCost,
        completedAt: productionBatches.completedAt,
        notes: productionBatches.notes,
        sourcePayload: productionBatches.sourcePayload,
        recipeId: recipeVersions.id,
        recipeName: recipeVersions.name,
        recipeVersion: recipeVersions.version,
      })
      .from(productionBatches)
      .leftJoin(recipeVersions, eq(productionBatches.recipeVersionId, recipeVersions.id))
      .where(eq(productionBatches.id, data.id))
    const [outputs, consumptions, losses, costs] = await Promise.all([
      database
        .select({
          productId: productionBatchOutputs.productId,
          productName: products.name,
          productSku: products.sku,
          unit: productionBatchOutputs.unit,
          role: productionBatchOutputs.role,
          plannedQuantity: productionBatchOutputs.plannedQuantity,
          actualQuantity: productionBatchOutputs.actualQuantity,
          unitCost: productionBatchOutputs.unitCost,
        })
        .from(productionBatchOutputs)
        .innerJoin(products, eq(productionBatchOutputs.productId, products.id))
        .where(eq(productionBatchOutputs.productionBatchId, batch.id)),
      database
        .select({
          productName: products.name,
          unit: products.unit,
          quantity: productionBatchConsumptions.quantity,
          unitCost: productionBatchConsumptions.unitCost,
          totalCost: productionBatchConsumptions.totalCost,
        })
        .from(productionBatchConsumptions)
        .innerJoin(products, eq(productionBatchConsumptions.productId, products.id))
        .where(eq(productionBatchConsumptions.productionBatchId, batch.id)),
      database
        .select({ productName: products.name, quantity: productionBatchLosses.quantity, reason: productionBatchLosses.reason })
        .from(productionBatchLosses)
        .innerJoin(products, eq(productionBatchLosses.productId, products.id))
        .where(eq(productionBatchLosses.productionBatchId, batch.id)),
      database
        .select({ type: operationalCosts.type, quantity: operationalCosts.quantity, unit: operationalCosts.unit, unitAmount: operationalCosts.unitAmount, amount: operationalCosts.amount })
        .from(operationalCosts)
        .where(eq(operationalCosts.productionBatchId, batch.id)),
    ])
    const payload = (batch.sourcePayload ?? {}) as {
      losses?: Array<{ productId: number; quantity: string; reason: string }>
    }
    const plannedLosses = z.array(lossInput).safeParse(payload.losses ?? [])
    return {
      batch,
      outputs,
      consumptions,
      losses,
      plannedLosses: plannedLosses.success ? plannedLosses.data : [],
      costs,
    }
  })

export const completeProductionBatch = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { getDb } = await import('#/db/index')
    return getDb().transaction(async (tx) => {
      // Garante que uma segunda conclusão espere a primeira e então enxergue
      // o status atualizado antes de tentar criar qualquer movimento.
      await tx.execute(
        sql`select id from ${productionBatches} where ${productionBatches.id} = ${data.id} for update`,
      )
      const [batch] = await tx
        .select()
        .from(productionBatches)
        .where(eq(productionBatches.id, data.id))
      if (batch.status !== 'draft')
        throw new Error('Somente lotes em rascunho podem ser concluídos uma vez.')
      if (!batch.recipeVersionId || !batch.plannedFor || !batch.recipeMultiplier)
        throw new Error('O rascunho não possui receita, data ou multiplicador válidos.')

      const [outputs, completedLosses] = await Promise.all([
        tx
          .select({ productId: productionBatchOutputs.productId, plannedQuantity: productionBatchOutputs.plannedQuantity, role: productionBatchOutputs.role })
          .from(productionBatchOutputs)
          .where(eq(productionBatchOutputs.productionBatchId, batch.id)),
        tx
          .select({ productId: productionBatchLosses.productId, quantity: productionBatchLosses.quantity, reason: productionBatchLosses.reason })
          .from(productionBatchLosses)
          .where(eq(productionBatchLosses.productionBatchId, batch.id)),
      ])
      if (!outputs.length) throw new Error('O rascunho não possui saídas.')
      const payload = (batch.sourcePayload ?? {}) as {
        losses?: Array<{ productId: number; quantity: string; reason: string }>
      }
      const draftLosses = z.array(lossInput).safeParse(payload.losses ?? [])
      if (!draftLosses.success)
        throw new Error('As perdas registradas no rascunho são inválidas.')
      if (completedLosses.some((loss) => !loss.reason.trim()))
        throw new Error('Toda perda manual exige motivo.')

      const input: BatchInput = {
        recipeVersionId: batch.recipeVersionId,
        productionDate: batch.plannedFor,
        recipeMultiplier: batch.recipeMultiplier,
        outputs: outputs
          .filter((output) => output.role === 'primary')
          .map((output) => ({ productId: output.productId, quantity: output.plannedQuantity ?? '0' })),
        bordinhasQuantity:
          outputs.find((output) => output.role === 'co_product')?.plannedQuantity ?? '0',
        losses: draftLosses.data.map((loss) => ({
          productId: loss.productId,
          quantity: loss.quantity,
          reason: loss.reason,
        })),
        notes: batch.notes ?? undefined,
      }
      const plan = await loadPlan(tx, input)
      const productIds = plan.consumptions.map((consumption) => consumption.id).sort((a, b) => a - b)
      // Serializa conclusões concorrentes dos mesmos insumos antes de apurar saldos.
      if (productIds.length) {
        await tx.execute(
          sql`select id from ${products} where ${products.id} in ${productIds} order by ${products.id} for update`,
        )
      }
      const costs = await enrichCosts(tx, plan)
      const insufficient = costs.costs.filter((cost) => cost.available < cost.quantity)
      if (insufficient.length) {
        throw new Error(
          `Estoque insuficiente: ${insufficient.map((item) => `${item.name} (${thousandthsToQuantity(item.available)} disponível; ${thousandthsToQuantity(item.quantity)} necessário)`).join(', ')}.`,
        )
      }

      await tx.insert(productionBatchConsumptions).values(
        costs.costs.map((cost) => ({
          sourceKey: `manual:production-batch:${batch.id}:consumption:${cost.id}`,
          sourceHash: `completed-${batch.id}-consumption-${cost.id}`,
          productionBatchId: batch.id,
          recipeItemId: plan.baseRows.find((item) => item.productId === cost.id)?.id ?? null,
          productId: cost.id,
          quantity: thousandthsToQuantity(cost.quantity),
          unitCost: centsToMoney(cost.unitCost),
          totalCost: centsToMoney(cost.totalCost),
          sourcePayload: { origin: 'manual_production_completion', components: cost.source },
        })),
      )
      await tx.insert(stockMovements).values(
        costs.costs.map((cost) => ({
          productId: cost.id,
          type: 'production' as const,
          quantityDelta: `-${thousandthsToQuantity(cost.quantity)}`,
          unitCost: centsToMoney(cost.unitCost),
          referenceType: 'production_consumption',
          referenceId: batch.id,
          sourceKey: `manual:production-batch:${batch.id}:stock-consumption:${cost.id}`,
          sourceHash: `completed-${batch.id}-stock-consumption-${cost.id}`,
          occurredAt: new Date(`${batch.plannedFor}T12:00:00.000Z`),
        })),
      )
      await tx.insert(operationalCosts).values(
        plan.operational.map((item) => ({
          sourceId: `manual:production-batch:${batch.id}:operational:${item.requirement.type}`,
          sourceHash: `completed-${batch.id}-operational-${item.requirement.type}`,
          type: item.requirement.type,
          productionBatchId: batch.id,
          operationalRateId: item.rate.id,
          quantity: thousandthsToQuantity(item.quantity),
          unit: item.requirement.unit,
          unitAmount: item.rate.unitAmount,
          amount: centsToMoney(item.amountCents),
          occurredAt: batch.plannedFor,
          notes: 'Tarifa vigente efetivamente aplicada ao lote.',
        })),
      )
      await tx.insert(stockMovements).values(
        plan.sellableOutputs.map((output) => ({
          productId: output.product.id,
          type: 'production' as const,
          quantityDelta: thousandthsToQuantity(output.quantity),
          unitCost: centsToMoney(costs.outputUnitCost),
          referenceType: 'production_output',
          referenceId: batch.id,
          sourceKey: `manual:production-batch:${batch.id}:stock-output:${output.product.id}`,
          sourceHash: `completed-${batch.id}-stock-output-${output.product.id}`,
          occurredAt: new Date(`${batch.plannedFor}T12:00:00.000Z`),
        })),
      )
      await Promise.all(
        plan.sellableOutputs.map((output) =>
          tx
            .update(productionBatchOutputs)
            .set({
              actualQuantity: thousandthsToQuantity(output.quantity),
              unitCost: centsToMoney(costs.outputUnitCost),
            })
            .where(
              and(
                eq(productionBatchOutputs.productionBatchId, batch.id),
                eq(productionBatchOutputs.productId, output.product.id),
              ),
            ),
        ),
      )
      if (draftLosses.data.length) {
        await tx.insert(productionBatchLosses).values(
          draftLosses.data.map((loss) => ({
            sourceKey: `manual:production-batch:${batch.id}:loss:${loss.productId}`,
            sourceHash: `completed-${batch.id}-loss-${loss.productId}`,
            productionBatchId: batch.id,
            productId: loss.productId,
            quantity: loss.quantity.trim().replace(',', '.'),
            reason: loss.reason.trim(),
            sourcePayload: { origin: 'manual_loss_declared_in_draft' },
          })),
        )
      }
      await tx
        .update(productionBatches)
        .set({
          status: 'completed',
          actualQuantity: thousandthsToQuantity(costs.grossQuantity),
          totalCost: centsToMoney(costs.totalCost),
          unitCost: centsToMoney(costs.outputUnitCost),
          completedAt: new Date(),
          completionPayload: {
            costMethod: 'perpetual_weighted_average',
            completedAt: new Date().toISOString(),
            capacity: plan.capacity,
            operationalRates: plan.operational.map((item) => ({
              type: item.requirement.type,
              rateId: item.rate.id,
              unitAmount: item.rate.unitAmount,
              effectiveFrom: item.rate.effectiveFrom,
            })),
          },
          updatedAt: new Date(),
        })
        .where(and(eq(productionBatches.id, batch.id), eq(productionBatches.status, 'draft')))
      return { id: batch.id, totalCost: centsToMoney(costs.totalCost) }
    })
  })
