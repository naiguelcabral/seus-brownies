import {
  centsToMoney,
  moneyToCents,
  quantityToThousandths,
} from '#/features/production/calculations'

export type AccrualMarginEvent = {
  id: number
  type: string
  saleId: number | null
  saleItemId: number | null
  revenueEffect: string
}

export type AccrualMarginSale = {
  id: number
  locationId: number | null
  locationName: string | null
}

export type AccrualMarginSaleItem = {
  id: number
  saleId: number
  productId: number | null
  productName: string
  revenue: string
}

export type AccrualMarginAllocation = {
  id: number
  saleItemId: number
  productionBatchId: number | null
  quantity: string
  allocatedCost: string
}

type MoneyTotals = { revenue: bigint; cogs: bigint }

function signedMoneyToCents(value: string) {
  const normalized = value.trim().replace(',', '.')
  const negative = normalized.startsWith('-')
  const cents = moneyToCents(negative ? normalized.slice(1) : normalized)
  if (cents === null) throw new Error('Fato financeiro com valor inválido.')
  return negative ? -cents : cents
}

function positiveMoneyToCents(value: string) {
  const cents = moneyToCents(value)
  if (cents === null || cents < 0n)
    throw new Error('Alocação financeira com valor inválido.')
  return cents
}

function positiveQuantity(value: string) {
  const quantity = quantityToThousandths(value)
  if (quantity === null || quantity <= 0n)
    throw new Error('Alocação FIFO com quantidade inválida.')
  return quantity
}

function allocateSignedAmount(
  amount: bigint,
  rows: Array<{ id: number; weight: bigint }>,
) {
  if (!rows.length) return new Map<number, bigint>()
  if (rows.some((row) => row.weight < 0n))
    throw new Error('Peso financeiro inválido.')
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0n)
  if (totalWeight <= 0n)
    throw new Error(
      'Não foi possível ratear o fato financeiro sem base positiva.',
    )

  const sign = amount < 0n ? -1n : 1n
  const absolute = amount < 0n ? -amount : amount
  const shares = rows.map((row) => {
    const numerator = absolute * row.weight
    return {
      id: row.id,
      amount: numerator / totalWeight,
      remainder: numerator % totalWeight,
    }
  })
  let residue = absolute - shares.reduce((sum, row) => sum + row.amount, 0n)
  for (const row of [...shares].sort((left, right) => {
    if (left.remainder === right.remainder) return left.id - right.id
    return left.remainder > right.remainder ? -1 : 1
  })) {
    if (residue === 0n) break
    row.amount += 1n
    residue -= 1n
  }
  return new Map(shares.map((row) => [row.id, row.amount * sign]))
}

function addTotals(
  totals: Map<string, MoneyTotals>,
  key: string,
  values: Partial<MoneyTotals>,
) {
  const current = totals.get(key) ?? { revenue: 0n, cogs: 0n }
  current.revenue += values.revenue ?? 0n
  current.cogs += values.cogs ?? 0n
  totals.set(key, current)
}

function formatTotals(total: MoneyTotals) {
  return {
    revenue: centsToMoney(total.revenue),
    cogs: centsToMoney(total.cogs),
    grossMargin: centsToMoney(total.revenue - total.cogs),
  }
}

function sumTotals(totals: Map<string, MoneyTotals>) {
  return [...totals.values()].reduce(
    (sum, item) => ({
      revenue: sum.revenue + item.revenue,
      cogs: sum.cogs + item.cogs,
    }),
    { revenue: 0n, cogs: 0n },
  )
}

export function summarizeAccrualMargins(input: {
  events: AccrualMarginEvent[]
  sales: AccrualMarginSale[]
  saleItems: AccrualMarginSaleItem[]
  allocations: AccrualMarginAllocation[]
}) {
  const salesById = new Map(input.sales.map((sale) => [sale.id, sale]))
  const itemsById = new Map(input.saleItems.map((item) => [item.id, item]))
  const itemsBySale = new Map<number, AccrualMarginSaleItem[]>()
  const allocationsByItem = new Map<number, AccrualMarginAllocation[]>()
  for (const item of input.saleItems) {
    const rows = itemsBySale.get(item.saleId) ?? []
    rows.push(item)
    itemsBySale.set(item.saleId, rows)
  }
  for (const allocation of input.allocations) {
    const rows = allocationsByItem.get(allocation.saleItemId) ?? []
    rows.push(allocation)
    allocationsByItem.set(allocation.saleItemId, rows)
  }

  const productTotals = new Map<string, MoneyTotals>()
  const productLabels = new Map<
    string,
    { productId: number | null; productName: string }
  >()
  const batchTotals = new Map<string, MoneyTotals>()
  const locationTotals = new Map<string, MoneyTotals>()
  const locationLabels = new Map<
    string,
    { locationId: number | null; locationName: string }
  >()
  const deliveredSales = new Set<number>()
  let netRevenue = 0n
  let cogs = 0n
  let unattributedRevenue = 0n

  const productKey = (item: AccrualMarginSaleItem) =>
    item.productId === null
      ? `snapshot:${item.productName}`
      : `product:${item.productId}`
  const batchKey = (productionBatchId: number | null) =>
    productionBatchId === null ? 'without-batch' : `batch:${productionBatchId}`
  const locationKey = (sale: AccrualMarginSale) =>
    sale.locationId === null
      ? 'without-location'
      : `location:${sale.locationId}`

  function addItemRevenue(item: AccrualMarginSaleItem, revenue: bigint) {
    const key = productKey(item)
    productLabels.set(key, {
      productId: item.productId,
      productName: item.productName,
    })
    addTotals(productTotals, key, { revenue })

    const allocations = allocationsByItem.get(item.id) ?? []
    if (!allocations.length) {
      addTotals(batchTotals, batchKey(null), { revenue })
      return
    }
    const shares = allocateSignedAmount(
      revenue,
      allocations.map((allocation) => ({
        id: allocation.id,
        weight: positiveQuantity(allocation.quantity),
      })),
    )
    for (const allocation of allocations)
      addTotals(batchTotals, batchKey(allocation.productionBatchId), {
        revenue: shares.get(allocation.id) ?? 0n,
      })
  }

  for (const event of input.events) {
    const revenueEffect = signedMoneyToCents(event.revenueEffect)
    netRevenue += revenueEffect
    const sale = event.saleId === null ? null : salesById.get(event.saleId)
    if (event.saleId !== null && !sale)
      throw new Error('Fato financeiro aponta para venda ausente no relatório.')
    if (sale) {
      const key = locationKey(sale)
      locationLabels.set(key, {
        locationId: sale.locationId,
        locationName: sale.locationName ?? 'Sem local/canal',
      })
      addTotals(locationTotals, key, { revenue: revenueEffect })
    }

    if (revenueEffect !== 0n) {
      if (event.saleItemId !== null) {
        const item = itemsById.get(event.saleItemId)
        if (!item || item.saleId !== event.saleId)
          throw new Error('Fato financeiro aponta para item de venda inválido.')
        addItemRevenue(item, revenueEffect)
      } else if (event.saleId !== null) {
        const items = itemsBySale.get(event.saleId) ?? []
        const shares = allocateSignedAmount(
          revenueEffect,
          items.map((item) => ({
            id: item.id,
            weight: positiveMoneyToCents(item.revenue),
          })),
        )
        for (const item of items)
          addItemRevenue(item, shares.get(item.id) ?? 0n)
      } else {
        unattributedRevenue += revenueEffect
      }
    }

    if (event.type !== 'sale_revenue') continue
    if (event.saleId === null)
      throw new Error('Receita de entrega sem venda vinculada.')
    if (deliveredSales.has(event.saleId))
      throw new Error('Venda possui mais de um fato de receita de entrega.')
    deliveredSales.add(event.saleId)

    let saleCogs = 0n
    for (const item of itemsBySale.get(event.saleId) ?? []) {
      const key = productKey(item)
      productLabels.set(key, {
        productId: item.productId,
        productName: item.productName,
      })
      for (const allocation of allocationsByItem.get(item.id) ?? []) {
        const allocationCost = positiveMoneyToCents(allocation.allocatedCost)
        saleCogs += allocationCost
        cogs += allocationCost
        addTotals(productTotals, key, { cogs: allocationCost })
        addTotals(batchTotals, batchKey(allocation.productionBatchId), {
          cogs: allocationCost,
        })
      }
    }
    const deliveredSale = salesById.get(event.saleId)
    if (!deliveredSale)
      throw new Error('Receita de entrega aponta para venda ausente.')
    addTotals(locationTotals, locationKey(deliveredSale), { cogs: saleCogs })
  }

  const productSummary = sumTotals(productTotals)
  const batchSummary = sumTotals(batchTotals)
  const locationSummary = sumTotals(locationTotals)
  const dimensionMatches = (summary: MoneyTotals) =>
    summary.revenue + unattributedRevenue === netRevenue &&
    summary.cogs === cogs

  return {
    netRevenue: centsToMoney(netRevenue),
    cogs: centsToMoney(cogs),
    grossMargin: centsToMoney(netRevenue - cogs),
    unattributedRevenue: centsToMoney(unattributedRevenue),
    reconciled:
      dimensionMatches(productSummary) &&
      dimensionMatches(batchSummary) &&
      dimensionMatches(locationSummary),
    byProduct: [...productTotals.entries()]
      .map(([key, total]) => ({
        ...productLabels.get(key)!,
        ...formatTotals(total),
      }))
      .sort(
        (left, right) =>
          (left.productId ?? Number.MAX_SAFE_INTEGER) -
            (right.productId ?? Number.MAX_SAFE_INTEGER) ||
          left.productName.localeCompare(right.productName, 'pt-BR'),
      ),
    byBatch: [...batchTotals.entries()]
      .map(([key, total]) => ({
        productionBatchId:
          key === 'without-batch' ? null : Number(key.slice('batch:'.length)),
        ...formatTotals(total),
      }))
      .sort(
        (left, right) =>
          (left.productionBatchId ?? Number.MAX_SAFE_INTEGER) -
          (right.productionBatchId ?? Number.MAX_SAFE_INTEGER),
      ),
    byLocation: [...locationTotals.entries()]
      .map(([key, total]) => ({
        ...locationLabels.get(key)!,
        ...formatTotals(total),
      }))
      .sort(
        (left, right) =>
          (left.locationId ?? Number.MAX_SAFE_INTEGER) -
            (right.locationId ?? Number.MAX_SAFE_INTEGER) ||
          left.locationName.localeCompare(right.locationName, 'pt-BR'),
      ),
  }
}
