import { expect, test } from '@playwright/test'

test('fumaça: vendas não gera erro de hidratação', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /Hydration failed/i.test(message.text()))
      hydrationErrors.push(message.text())
  })

  await page.goto('/vendas', { waitUntil: 'networkidle' })
  await expect(
    page.getByRole('heading', { name: 'Vendas', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Vendas recentes' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Registrar venda', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Registrar venda' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nova venda' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  expect(hydrationErrors).toEqual([])
})
