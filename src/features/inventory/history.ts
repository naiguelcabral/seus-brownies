import { businessDayEnd } from '../../lib/business-date'

export const inventoryProductTypes = [
  'ingredient',
  'packaging',
  'finished_product',
] as const

export const inventoryMovementTypes = [
  'purchase',
  'production',
  'sale',
  'adjustment',
  'loss',
  'return',
] as const

export const inventoryReorderStatuses = [
  'not_configured',
  'reorder',
  'ok',
] as const

export const inventoryBalancePageSize = 20
export const inventoryMovementPageSize = 30

export function calculateInventoryPage(
  requestedPage: number,
  total: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize,
    totalPages,
    offset: (page - 1) * pageSize,
  }
}

export function endOfInventoryDay(value: string) {
  return businessDayEnd(value)
}
