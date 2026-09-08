export const purchaseHistoryPageSize = 20

export function calculatePurchaseHistoryPage(
  requestedPage: number,
  total: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / purchaseHistoryPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: purchaseHistoryPageSize,
    totalPages,
    offset: (page - 1) * purchaseHistoryPageSize,
  }
}
