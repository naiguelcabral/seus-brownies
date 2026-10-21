import { quantityToThousandths } from '#/features/production/calculations'

export type DeliveryFifoDivergence = {
  code:
    | 'missing_items'
    | 'missing_allocation'
    | 'quantity_mismatch'
    | 'invalid_quantity'
    | 'missing_sale_reference'
  saleId: number | null
  saleItemId: number | null
  allocationIds: number[]
}

export type DeliveryFifoCoverageInput = {
  events: Array<{ type: string; saleId: number | null }>
  saleItems: Array<{ id: number; saleId: number; quantity: string }>
  allocations: Array<{ id: number; saleItemId: number; quantity: string }>
}

/** Read-only coverage of delivery facts loaded for the selected competence. */
export function diagnoseDeliveryFifoCoverage(input: DeliveryFifoCoverageInput) {
  const divergences: DeliveryFifoDivergence[] = input.events.flatMap((event) =>
    event.type === 'sale_revenue' && event.saleId === null
      ? [
          {
            code: 'missing_sale_reference',
            saleId: null,
            saleItemId: null,
            allocationIds: [],
          },
        ]
      : [],
  )
  const delivered = new Set(
    input.events.flatMap((event) =>
      event.type === 'sale_revenue' && event.saleId !== null
        ? [event.saleId]
        : [],
    ),
  )
  let checkedItems = 0
  for (const saleId of [...delivered].sort((a, b) => a - b)) {
    const items = input.saleItems.filter((item) => item.saleId === saleId)
    if (!items.length)
      divergences.push({
        code: 'missing_items',
        saleId,
        saleItemId: null,
        allocationIds: [],
      })
    for (const item of [...items].sort((a, b) => a.id - b.id)) {
      checkedItems++
      const rows = input.allocations.filter((row) => row.saleItemId === item.id)
      const allocationIds = rows.map((row) => row.id).sort((a, b) => a - b)
      const divergence = (code: DeliveryFifoDivergence['code']) =>
        divergences.push({ code, saleId, saleItemId: item.id, allocationIds })
      const expected = quantityToThousandths(item.quantity)
      const quantities = rows.map((row) => quantityToThousandths(row.quantity))
      if (
        expected === null ||
        expected <= 0n ||
        quantities.some((value) => value === null || value <= 0n)
      ) {
        divergence('invalid_quantity')
      } else if (!rows.length) {
        divergence('missing_allocation')
      } else if (
        quantities.reduce<bigint>((sum, value) => sum + value!, 0n) !== expected
      ) {
        divergence('quantity_mismatch')
      }
    }
  }
  return {
    checkedDeliveries: delivered.size,
    checkedItems,
    complete: divergences.length === 0,
    divergences,
  }
}
