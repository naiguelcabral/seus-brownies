export const salesLocationPageSize = 20

export function calculateSalesLocationPage(
  requestedPage: number,
  total: number,
) {
  const totalPages = Math.max(1, Math.ceil(total / salesLocationPageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return {
    page,
    pageSize: salesLocationPageSize,
    totalPages,
    offset: (page - 1) * salesLocationPageSize,
  }
}
