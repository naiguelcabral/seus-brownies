export const expenseHistoryPageSize = 20

export function calculateExpenseHistoryPage(
  requestedPage: number,
  total: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / expenseHistoryPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: expenseHistoryPageSize,
    totalPages,
    offset: (page - 1) * expenseHistoryPageSize,
  }
}
