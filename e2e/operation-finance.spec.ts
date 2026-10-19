import { test, expect } from '@playwright/test'
import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  preview = await startPreview('e2e/fixtures/operation-finance')
})
test.afterAll(async () => {
  await preview.close()
})
test('modal conserva preenchimento e calcula uma taxa para o pagamento inteiro', async ({
  page,
}) => {
  await page.goto(preview.url)
  await page
    .getByRole('button', { name: 'Registrar venda', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Registrar venda' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('29,51')
  await page.getByLabel('Valor bruto').fill('100.00')
  await page.getByRole('combobox').selectOption('credit')
  await expect(dialog).toContainText('96,64')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Registrar venda', exact: true }),
  ).toBeFocused()
  await page
    .getByRole('button', { name: 'Registrar venda', exact: true })
    .click()
  await expect(page.getByLabel('Valor bruto')).toHaveValue('100.00')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Lucro e meta conjunta' }),
  ).toContainText('511,51')
})
test('resultado e modal cabem no celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(preview.url)
  await page
    .getByRole('button', { name: 'Registrar venda', exact: true })
    .click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await expect(page.getByRole('dialog')).toBeVisible()
})
