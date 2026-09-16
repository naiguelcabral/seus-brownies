export const scenarioPageSize = 10

export function calculateScenarioPage(requestedPage: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / scenarioPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: scenarioPageSize,
    totalPages,
    offset: (page - 1) * scenarioPageSize,
  }
}
