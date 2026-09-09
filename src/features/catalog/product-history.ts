export const productHistoryPageSize = 20

export function calculateProductHistoryPage(
  requestedPage: number,
  total: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / productHistoryPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: productHistoryPageSize,
    totalPages,
    offset: (page - 1) * productHistoryPageSize,
  }
}
