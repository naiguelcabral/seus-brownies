const report = {
  period: { start: '2026-10-01', end: '2026-10-19' },
  revenueTotal: '0.00',
  expensesTotal: '0.00',
  inventoryTotal: '0.00',
  revenue: [],
  expensesByCategory: [],
  inventory: [],
  salesByProduct: [],
  topProducts: [],
  managementSettings: null,
  production: null,
  fifo: null,
  reconciliation: null,
  salesMetrics: {
    total: {
      events: 0,
      units: '0.000',
      ticketAverage: null,
      averageUnitPrice: null,
      audit: { difference: null },
    },
    byLocation: [],
  },
  operationalComparison: {
    previousPeriod: { start: '2026-09-12', end: '2026-09-30' },
    revenue: { current: '0.00', previous: '0.00', difference: '0.00' },
    units: { current: '0.000', previous: '0.000', difference: '0.000' },
    ticketAverage: { current: null, previous: null, difference: null },
  },
  integrity: {
    complete: false,
    checked: {
      layers: 1,
      allocations: 1,
      reversals: 0,
      movements: 1,
      productionBatches: 1,
      productionOutputs: 1,
      deliveries: 1,
      deliveryItems: 1,
    },
    divergences: [
      {
        area: 'cmv',
        code: 'quantity_mismatch',
        entityType: 'item de venda',
        entityId: 31,
        relatedIds: [2],
        message:
          'Quantidade entregue diverge da quantidade coberta pelas alocações FIFO.',
      },
    ],
  },
}

export const createFileRoute = (path: string) => (options: unknown) => ({
  options,
  fullPath: path,
  useLoaderData: () => report,
  useSearch: () => ({}),
})
export const useNavigate = () => async () => {}
