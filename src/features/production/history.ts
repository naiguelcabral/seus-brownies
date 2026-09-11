export const productionHistoryPageSize = 20

export function calculateProductionHistoryPage(
  requestedPage: number,
  total: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / productionHistoryPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: productionHistoryPageSize,
    totalPages,
    offset: (page - 1) * productionHistoryPageSize,
  }
}
