import { expect, test } from '@playwright/test'

test('fumaça: rota de produção está pronta', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /Hydration failed/i.test(message.text()))
      hydrationErrors.push(message.text())
  })
  await page.goto('/producao', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Produção' })).toBeVisible()
  await page
    .getByRole('button', { name: 'Adicionar lote', exact: true })
    .click()
  await expect(page.getByRole('dialog', { name: 'Novo lote' })).toBeVisible()
  await expect(page.getByLabel('Receita-base ativa')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  expect(hydrationErrors).toEqual([])
})
