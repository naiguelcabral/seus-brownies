import { test, expect } from '@playwright/test'
import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  preview = await startPreview('e2e/fixtures/payment-fees')
})
test.afterAll(async () => {
  await preview.close()
})
test('Pix é cobrado por pagamento, valor vendido não altera a tarifa fixa', async ({
  page,
}) => {
  await page.goto(preview.url)
  await page.getByLabel('Valor vendido (R$)').fill('30')
  const pix = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Pix', exact: true }) })
  await expect(pix).toContainText('0,49')
  await expect(pix).toContainText('29,51')
  await page
    .getByLabel('Quantidade de pagamentos Pix', { exact: true })
    .fill('2')
  await expect(pix).toContainText('0,98')
  await expect(pix).toContainText('29,02')
  await page
    .getByLabel('Quantidade de pagamentos Pix', { exact: true })
    .fill('1.5')
  await expect(page.getByRole('status')).toContainText('quantidade inteira')
})
test('meta Pix exige número explícito de pagamentos e funciona em celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(preview.url)
  await expect(
    page.getByText('Faturamento estimado:', { exact: false }),
  ).toHaveCount(0)
  await page.getByLabel('Quantidade estimada de pagamentos no mês').fill('100')
  await expect(page.getByRole('status')).toContainText('49,00')
  await expect(page.getByRole('status')).toContainText(
    'lucro após custos e taxas',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
