export const saleStatuses = ['draft', 'confirmed', 'paid', 'cancelled'] as const
export type SaleStatus = (typeof saleStatuses)[number]

export const saleHistoryPageSize = 20

export function calculateSaleHistoryPage(requestedPage: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / saleHistoryPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: saleHistoryPageSize,
    totalPages,
    offset: (page - 1) * saleHistoryPageSize,
  }
}

export function endOfSaleHistoryDay(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date
}
