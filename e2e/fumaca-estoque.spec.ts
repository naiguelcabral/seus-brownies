import { expect, test } from '@playwright/test'

test('fumaça: estoque não gera erro de hidratação', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error' && /Hydration failed/i.test(message.text())) hydrationErrors.push(message.text()) })
  await page.goto('/estoque', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible()
  expect(hydrationErrors).toEqual([])
})
