export type CsvCell = bigint | number | string | null | undefined

export type OperationalReportExport = {
  period: { start: string; end: string }
  revenueTotal: string
  expensesTotal: string
  inventoryTotal: string
  revenue: Array<{ channel: string; total: string }>
  expensesByCategory: Array<{ category: string; total: string }>
  inventory: Array<{
    productName: string
    unit: string
    balance: string
    value: string
  }>
  salesByProduct: Array<{
    productName: string
    quantity: string
    amount: string
  }>
  fifo: {
    netRevenue: string
    cogs: string
    grossMargin: string
    byProduct: Array<{
      productName: string
      revenue: string
      cogs: string
      grossMargin: string
    }>
    byBatch: Array<{
      productionBatchId: number
      revenue: string
      cogs: string
      grossMargin: string
    }>
    inventory: Array<{
      productName: string
      unit: string
      balance: string
      value: string
    }>
  } | null
  production: {
    batchCosts: Array<{
      id: number
      plannedFor: string | null
      amount: string
    }>
    consumptions: Array<{
      productName: string
      quantity: string
      amount: string | null
    }>
    losses: Array<{
      productName: string
      quantity: string
      reason: string | null
    }>
    operationalCosts: Array<{ type: 'energy' | 'labor'; amount: string }>
  } | null
}

type ExportRow = [
  section: CsvCell,
  description: CsvCell,
  quantity: CsvCell,
  unit: CsvCell,
  revenue: CsvCell,
  cogs: CsvCell,
  expense: CsvCell,
  value: CsvCell,
  note: CsvCell,
]

const spreadsheetFormulaPrefix = /^[\s\u0000-\u001f]*[=+\-@]/

/**
 * Formula prefixes are rendered as text so data entered by a customer or
 * supplier cannot execute when a CSV is opened in a spreadsheet application.
 */
export function protectSpreadsheetCell(value: CsvCell): string {
  const text = value == null ? '' : String(value)
  return spreadsheetFormulaPrefix.test(text) ? `'${text}` : text
}

export function createCsvDocument(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<CsvCell>>,
): string {
  const allRows = [headers, ...rows]
  if (allRows.some((row) => row.length !== headers.length)) {
    throw new Error(
      'Todas as linhas do CSV precisam ter o mesmo número de colunas.',
    )
  }
  const escaped = allRows.map((row) =>
    row
      .map(
        (value) => `"${protectSpreadsheetCell(value).replaceAll('"', '""')}"`,
      )
      .join(';'),
  )
  return `\uFEFF${escaped.join('\r\n')}\r\n`
}

/** Values remain in their exact decimal representation; no monetary value is converted to Number. */
export function createOperationalReportCsv(
  report: OperationalReportExport,
): string {
  const rows: ExportRow[] = [
    ['Período', 'Início', '', '', '', '', '', '', report.period.start],
    ['Período', 'Fim', '', '', '', '', '', '', report.period.end],
    [
      'Resumo',
      'Faturamento confirmado',
      '',
      '',
      report.revenueTotal,
      '',
      '',
      '',
      '',
    ],
    ['Resumo', 'Despesas', '', '', '', '', report.expensesTotal, '', ''],
    [
      'Resumo',
      'Estoque valorizado',
      '',
      '',
      '',
      '',
      '',
      report.inventoryTotal,
      '',
    ],
    ...report.revenue.map((item): ExportRow => [
      'Faturamento por canal',
      item.channel,
      '',
      '',
      item.total,
      '',
      '',
      '',
      '',
    ]),
    ...report.expensesByCategory.map((item): ExportRow => [
      'Despesas por categoria',
      item.category,
      '',
      '',
      '',
      '',
      item.total,
      '',
      '',
    ]),
    ...report.inventory.map((item): ExportRow => [
      'Estoque e custo médio',
      item.productName,
      item.balance,
      item.unit,
      '',
      '',
      '',
      item.value,
      '',
    ]),
    ...report.salesByProduct.map((item): ExportRow => [
      'Vendas por produto',
      item.productName,
      item.quantity,
      'unit',
      item.amount,
      '',
      '',
      '',
      '',
    ]),
  ]

  if (report.fifo) {
    rows.push(
      [
        'CMV e margem FIFO',
        'Receita líquida alocada',
        '',
        '',
        report.fifo.netRevenue,
        '',
        '',
        '',
        '',
      ],
      ['CMV e margem FIFO', 'CMV', '', '', '', report.fifo.cogs, '', '', ''],
      [
        'CMV e margem FIFO',
        'Margem bruta',
        '',
        '',
        '',
        '',
        '',
        report.fifo.grossMargin,
        '',
      ],
      ...report.fifo.byProduct.map((item): ExportRow => [
        'Margem FIFO por produto',
        item.productName,
        '',
        '',
        item.revenue,
        item.cogs,
        '',
        item.grossMargin,
        '',
      ]),
      ...report.fifo.byBatch.map((item): ExportRow => [
        'Margem FIFO por lote',
        `Lote #${item.productionBatchId}`,
        '',
        '',
        item.revenue,
        item.cogs,
        '',
        item.grossMargin,
        '',
      ]),
      ...report.fifo.inventory.map((item): ExportRow => [
        'Estoque FIFO remanescente',
        item.productName,
        item.balance,
        item.unit,
        '',
        '',
        '',
        item.value,
        '',
      ]),
    )
  }

  if (report.production) {
    rows.push(
      ...report.production.consumptions.map((item): ExportRow => [
        'Consumo de insumos',
        item.productName,
        item.quantity,
        '',
        '',
        '',
        '',
        item.amount ?? '',
        '',
      ]),
      ...report.production.losses.map((item): ExportRow => [
        'Perdas declaradas',
        item.productName,
        item.quantity,
        '',
        '',
        '',
        '',
        '',
        item.reason ?? '',
      ]),
      ...report.production.batchCosts.map((item): ExportRow => [
        'Custos por lote',
        `Lote #${item.id}`,
        '',
        '',
        '',
        '',
        '',
        item.amount,
        item.plannedFor ?? 'sem data',
      ]),
      ...report.production.operationalCosts.map((item): ExportRow => [
        'Custos operacionais',
        item.type === 'energy' ? 'Energia' : 'Mão de obra',
        '',
        '',
        '',
        '',
        '',
        item.amount,
        '',
      ]),
    )
  }

  return createCsvDocument(
    [
      'Seção',
      'Descrição',
      'Quantidade',
      'Unidade',
      'Receita (BRL)',
      'CMV (BRL)',
      'Despesa (BRL)',
      'Valor (BRL)',
      'Observação',
    ],
    rows,
  )
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(url)
}
