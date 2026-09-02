import { expect, test } from '@playwright/test'

test.use({ screenshot: 'on', trace: 'on', video: 'on' })

/**
 * Manual, scenario-by-scenario suite. It is not part of npm test. Invoke one
 * authorized title with --grep and --output=/tmp/seus-brownies-playwright.
 */
for (const scenario of [
  'cancelamento integral', 'devolução parcial', 'devolução total',
  'devolução acima do permitido', 'perda multicamada', 'ajuste negativo',
  'ajuste positivo', 'repetição idempotente', 'falha transacional', 'duplo clique UI',
]) {
  test(`FIFO fase 2 — ${scenario}`, async ({ page }, testInfo) => {
    test.skip(true, 'Cenário bloqueado: requer autorização explícita, referência exclusiva e pré-checagem GET-only.')
    const events: string[] = []
    page.on('console', (message) => events.push(`console:${message.type()}:${message.text()}`))
    page.on('requestfailed', (request) => events.push(`requestfailed:${request.method()}:${request.url()}`))
    page.on('response', (response) => events.push(`response:${response.status()}:${response.request().method()}:${response.url()}`))
    await page.goto('/estoque', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('fifo-lifecycle-client-ready')).toBeVisible()
    // Scenario data and the one authorized click are deliberately supplied only
    // at execution time, after its separate, scenario-specific approval.
    await testInfo.attach('sanitized-browser-events.txt', { body: events.join('\n'), contentType: 'text/plain' })
  })
}
