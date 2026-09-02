import { expect, test } from '@playwright/test'

test.use({ screenshot: 'on', trace: 'on', video: 'on' })

test.skip('G7 histórico — PROD003, 24 un., R$ 60,48', async ({ page }, testInfo) => {
  // This scenario consumed its reference in HML. Keep the assertions as an
  // audit record, but never allow an accidental rerun to issue its POST again.
  const events: Array<{ type: string; method?: string; path?: string; status?: number; text?: string }> = []
  page.on('console', (message) => events.push({ type: `console:${message.type()}`, text: message.text() }))
  page.on('requestfailed', (request) => events.push({ type: 'requestfailed', method: request.method(), path: new URL(request.url()).pathname }))
  page.on('response', (response) => {
    const request = response.request()
    events.push({ type: 'response', method: request.method(), path: new URL(request.url()).pathname, status: response.status() })
  })

  const stockResponse = await page.goto('/estoque', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('fifo-lifecycle-client-ready')).toBeVisible()
  const form = page.locator('form').filter({ hasText: 'Ajuste positivo' })
  await form.getByLabel('Produto').selectOption({ label: 'Brownie Recheado 5x5 (Brigadeiro) · PROD003' })
  await form.getByLabel('Quantidade').fill('24')
  await form.getByRole('textbox', { name: 'Custo total' }).fill('60,48')
  await form.getByLabel('Origem do custo').fill('Ficha Técnica — Receita Base')
  await form.getByLabel('Motivo').fill('registro da fornada padrão')
  await form.getByLabel('Referência').fill('HML2-POS-G6-20260902')
  await form.getByLabel(/Confirmo que este ajuste aumenta o estoque/).check()
  await expect(form.getByRole('button', { name: 'Registrar ajuste positivo' })).toBeEnabled()
  await form.getByRole('button', { name: 'Registrar ajuste positivo' }).click()
  await expect(page.getByText('Evento FIFO registrado.')).toBeVisible()
  await expect(page.getByText('+24 un.')).toBeVisible()

  const auditResponse = await page.goto('/fifo-migration-audit', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('fifo-migration-audit-result')).toBeVisible()
  const audit = JSON.parse(await page.getByTestId('fifo-migration-audit-result').textContent() ?? '{}')
  const posts = events.filter((event) => event.method === 'POST')
  const failures = events.filter((event) => event.type === 'requestfailed')
  const errors = events.filter((event) => event.type === 'console:error')

  await page.screenshot({ path: testInfo.outputPath('fifo-g7-positive-adjustment-audit.png'), fullPage: true })
  await testInfo.attach('sanitized-browser-events.json', { body: JSON.stringify(events, null, 2), contentType: 'application/json' })
  await testInfo.attach('sanitized-g7-audit.json', { body: JSON.stringify(audit, null, 2), contentType: 'application/json' })

  expect(stockResponse?.status()).toBe(200)
  expect(auditResponse?.status()).toBe(200)
  expect(posts).toHaveLength(1)
  expect(posts[0]?.status).toBe(200)
  expect(failures).toEqual([])
  expect(errors).toEqual([])
  expect(audit.classification).toBe('aplicada')
  expect(audit.fifoCounts.layers.value).toBe(3)
  expect(audit.fifoCounts.allocations.value).toBe(2)
  expect(audit.fifoCounts.reversals.value).toBe(0)
  expect(audit.g6PositiveAdjustment.existingMovements.value).toHaveLength(1)
  expect(audit.g6PositiveAdjustment.details.value).toEqual([expect.objectContaining({
    product_id: 3,
    quantity_delta: '24.000',
    allocated_cost: '60.48',
    reference_type: 'adjustment_positive',
    notes: 'registro da fornada padrão | origem: Ficha Técnica — Receita Base',
    origin: 'adjustment',
    original_quantity: '24.000',
    original_cost: '60.48',
    remaining_quantity: '24.000',
    remaining_cost: '60.48',
  })])
  expect(audit.hmlInvariants.layers.value).toEqual([
    expect.objectContaining({ id: 1, remaining_quantity: '10.000', remaining_cost: '37.77' }),
    expect.objectContaining({ id: 2, remaining_quantity: '6.000', remaining_cost: '22.67' }),
  ])
  expect(audit.hmlInvariants.allocations.value).toHaveLength(2)
  expect(audit.hmlInvariants.sales.value).toEqual([
    expect.objectContaining({ id: 1, status: 'confirmed' }),
    expect.objectContaining({ id: 2, status: 'confirmed' }),
  ])
  expect(audit.hmlInvariants.batch.value).toEqual([expect.objectContaining({ id: 18, status: 'completed' })])
})
