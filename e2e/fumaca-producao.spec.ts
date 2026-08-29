import { expect, test } from '@playwright/test'

test('fumaça: rota de produção está pronta', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error' && /Hydration failed/i.test(message.text())) hydrationErrors.push(message.text()) })
  await page.goto('/producao', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Produção' })).toBeVisible()
  await expect(page.getByText('Novo lote')).toBeVisible()
  await expect(page.getByLabel('Receita-base ativa')).toBeVisible()
  expect(hydrationErrors).toEqual([])
})
