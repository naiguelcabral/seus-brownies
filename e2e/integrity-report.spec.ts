import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  const fixture = resolve('e2e/fixtures/integrity-report')
  preview = await startPreview(fixture, {
    '@tanstack/react-router': resolve(fixture, 'router.ts'),
    '#/components/ManagementLayout': resolve(fixture, 'components.tsx'),
    '#/features/reports/functions': resolve(fixture, 'reports.ts'),
    '#/features/reports/csv-export': resolve(fixture, 'csv.ts'),
    '#/lib/format-money': resolve(fixture, 'money.ts'),
  })
})
test.afterAll(async () => {
  await preview.close()
})

test('exibe divergência integrada sem oferecer correção automática', async ({
  page,
}) => {
  await page.goto(preview.url)
  const section = page
    .getByText('Conferência integrada de integridade')
    .locator('..')
    .locator('..')
  await expect(section).toContainText('apenas por leitura')
  await expect(section).toContainText('Quantidade entregue diverge')
  await expect(section).toContainText('item de venda #31')
  await expect(section).not.toContainText('Corrigir')
})

test('a conferência cabe em tela móvel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(preview.url)
  await expect(
    page.getByText('Conferência integrada de integridade'),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
