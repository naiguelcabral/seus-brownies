import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCsvDocument,
  createOperationalReportCsv,
  protectSpreadsheetCell,
} from '../src/features/reports/csv-export'

test('neutraliza prefixos de fórmula, preservando o conteúdo original', () => {
  assert.equal(
    protectSpreadsheetCell('=HYPERLINK("https://example.test")'),
    '\'=HYPERLINK("https://example.test")',
  )
  assert.equal(protectSpreadsheetCell(' \t-12,50'), "' \t-12,50")
  assert.equal(protectSpreadsheetCell('\u0000=1+1'), "'\u0000=1+1")
  assert.equal(protectSpreadsheetCell('@SUM(A1:A2)'), "'@SUM(A1:A2)")
  assert.equal(protectSpreadsheetCell('Brownie'), 'Brownie')
})

test('gera CSV UTF-8 delimitado, com aspas escapadas e linhas completas', () => {
  assert.equal(
    createCsvDocument(['Cabeçalho', 'Valor'], [['Fornecedor; "Lote"', '=1+1']]),
    '\uFEFF"Cabeçalho";"Valor"\r\n"Fornecedor; ""Lote""";"\'=1+1"\r\n',
  )
  assert.throws(
    () => createCsvDocument(['Uma coluna'], [['a', 'b']]),
    /mesmo número de colunas/,
  )
})

test('exporta valores financeiros e quantidades sem conversão de precisão', () => {
  const document = createOperationalReportCsv({
    period: { start: '2026-09-01', end: '2026-09-08' },
    revenueTotal: '12345678901234567890.12',
    expensesTotal: '2.30',
    inventoryTotal: '9.10',
    revenue: [{ channel: '=Canal externo', total: '1.10' }],
    expensesByCategory: [{ category: 'Embalagem', total: '2.30' }],
    inventory: [
      {
        productName: 'Brownie',
        unit: 'unit',
        balance: '10000000000000000000.125',
        value: '9.10',
      },
    ],
    salesByProduct: [
      { productName: 'Brownie', quantity: '1.000', amount: '1.10' },
    ],
    fifo: null,
    production: null,
  })

  assert.match(document, /12345678901234567890\.12/)
  assert.match(document, /10000000000000000000\.125/)
  assert.match(document, /"'=Canal externo"/)
})
