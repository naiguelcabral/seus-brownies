import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('entrega de venda é protegida, confirmada na UI e atualiza o histórico', async () => {
  const [salesRoute, salesFunctions, policies] = await Promise.all([
    readFile(new URL('../src/routes/vendas.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL('../src/features/operations/functions.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL(
        '../src/features/auth/server-function-policy.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ])

  assert.match(salesRoute, /useServerFn\(deliverSale\)/)
  assert.match(salesRoute, /hasPermission\(context\.appRole, 'sales:write'\)/)
  assert.match(
    salesRoute,
    /Confirmo a entrega\. A receita será reconhecida por/,
  )
  assert.match(salesRoute, /await router\.invalidate\(\)/)
  assert.match(salesFunctions, /deliveredAt: sales\.deliveredAt/)
  assert.match(policies, /deliverSale: 'sales:write'/)
})

test('reconciliação mantém diagnóstico somente leitura e agrupa divergências', async () => {
  const [route, reconciliation] = await Promise.all([
    readFile(new URL('../src/routes/relatorios.tsx', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../src/features/reports/inventory-reconciliation.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ])

  assert.match(route, /<ReconciliationDivergences/)
  assert.match(route, /divergences\.reduce<Record<string, number>>/)
  assert.match(reconciliation, /It never writes or proposes data repair/)
})
