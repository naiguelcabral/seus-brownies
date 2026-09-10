export const actionPlanPageSize = 20

export function calculateActionPlanPage(requestedPage: number, total: number) {
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(0, total) / actionPlanPageSize),
  )
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: actionPlanPageSize,
    totalPages,
    offset: (page - 1) * actionPlanPageSize,
  }
}
