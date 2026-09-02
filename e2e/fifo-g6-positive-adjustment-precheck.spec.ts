import { expect, test } from '@playwright/test'

test('G6 pré-checagem GET-only de ajuste positivo', async ({ page }, testInfo) => {
  const consoleMessages: string[] = []
  const requests: Array<{ method: string; path: string; status?: number }> = []
  const failures: string[] = []
  page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`))
  page.on('request', (request) => requests.push({ method: request.method(), path: new URL(request.url()).pathname }))
  page.on('response', (response) => {
    const request = response.request()
    if (request.url().includes('/_serverFn/')) requests.push({ method: request.method(), path: new URL(request.url()).pathname, status: response.status() })
  })
  page.on('requestfailed', (request) => failures.push(new URL(request.url()).pathname))

  const stockResponse = await page.goto('/estoque', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('fifo-lifecycle-client-ready')).toBeVisible()
  const positiveForm = page.locator('form').filter({ hasText: 'Ajuste positivo' })
  await expect(positiveForm).toBeVisible()
  const fields = await positiveForm.locator('label').allTextContents()
  const positiveConfirmationVisible = await positiveForm.locator('input[type="checkbox"]').count() > 0
  const submitEnabled = await positiveForm.getByRole('button', { name: 'Registrar ajuste positivo' }).isEnabled()

  const auditResponse = await page.goto('/fifo-migration-audit', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('fifo-migration-audit-client-ready')).toBeVisible()
  await expect(page.getByTestId('fifo-migration-audit-result').or(page.getByTestId('fifo-migration-audit-error'))).toBeVisible()
  const payload = await page.getByTestId('fifo-migration-audit-result').textContent()
  await page.screenshot({ path: testInfo.outputPath('fifo-g6-positive-precheck.png'), fullPage: true })
  console.log(JSON.stringify({ stockStatus: stockResponse?.status(), auditStatus: auditResponse?.status(), fields, positiveConfirmationVisible, submitEnabled, payload, console: consoleMessages, requests, failures }))
  expect(stockResponse?.status()).toBe(200)
  expect(auditResponse?.status()).toBe(200)
  expect(positiveConfirmationVisible).toBe(true)
  expect(submitEnabled).toBe(false)
  expect(failures).toEqual([])
  expect(requests.every((request) => request.method === 'GET')).toBe(true)
  await expect(page.getByTestId('fifo-migration-audit-error')).toHaveCount(0)
})
