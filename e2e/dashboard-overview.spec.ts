import { test, expect } from '@playwright/test'
import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  preview = await startPreview('e2e/fixtures/dashboard')
})
test.afterAll(async () => {
  await preview.close()
})
test.beforeEach(async ({ page }) => {
  await page.goto(preview.url)
})

test('painel vazio orienta a operação e oferece atalhos sem inventar resultados', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', {
      name: 'O essencial para cuidar dos Seus Brownies',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Comece pelos registros da operação' }),
  ).toBeVisible()
  await expect(
    page.getByText('Nenhum alerta de reposição', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Registrar venda/ }),
  ).toHaveAttribute('href', /\/vendas/)
  await expect(
    page.getByRole('link', { name: /Registrar compra/ }),
  ).toHaveAttribute('href', /\/compras/)
  await expect(
    page.getByRole('region', { name: 'Indicadores principais' }),
  ).toContainText('R$ 0,00')
  await page.screenshot({
    path: '/tmp/cacau-dashboard-empty.png',
    fullPage: true,
  })
})
test('atenção mostra cinco itens e deixa claro o total; registros mantêm situação e data', async ({
  page,
}) => {
  await page.getByLabel('Dados do painel').selectOption('populated')
  const attention = page.getByRole('region', {
    name: 'O que precisa de atenção',
  })
  await expect(attention.getByRole('listitem')).toHaveCount(5)
  await expect(attention).toContainText('Exibindo 5 de 7 itens')
  await expect(
    page.getByRole('heading', { name: 'Comece pelos registros da operação' }),
  ).toHaveCount(0)
  await expect(page.getByText('Rascunho', { exact: true })).toBeVisible()
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Indicadores principais' }),
  ).toContainText('R$ 1.234,56')
  await page.setViewportSize({ width: 1440, height: 1080 })
  await page.screenshot({
    path: '/tmp/cacau-dashboard-desktop.png',
    fullPage: true,
  })
})
test('atualizar indica carregamento; ações respeitam permissões do papel', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Atualizar painel' }).click()
  await expect(
    page.getByRole('button', { name: 'Atualizando…' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Atualizar painel' }),
  ).toBeEnabled()
  await page.getByLabel('Papel de ensaio').selectOption('viewer')
  const actions = page.getByRole('region', { name: 'Ações rápidas' })
  await expect(actions.getByRole('link')).toHaveCount(0)
})
test('layout móvel mantém cartões e ações sem rolagem horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('Dados do painel').selectOption('populated')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  await expect(
    page.getByRole('heading', { name: 'Ações rápidas' }),
  ).toBeVisible()
  await page.screenshot({
    path: '/tmp/cacau-dashboard-mobile.png',
    fullPage: true,
  })
})
