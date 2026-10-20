import { expect, test } from './isolated-test'
import type { Page } from '@playwright/test'
import { resolve } from 'node:path'
import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  const fixture = resolve('e2e/fixtures/operations-ux')
  preview = await startPreview(fixture, {
    '@tanstack/react-router': resolve(fixture, 'router.ts'),
    '@tanstack/react-start': resolve(fixture, 'start.ts'),
    '#/components/ManagementLayout': resolve(fixture, 'Layout.tsx'),
    '#/features/operations/functions': resolve(fixture, 'state.ts'),
    '#/features/production/functions': resolve(fixture, 'state.ts'),
  })
})
test.afterAll(async () => {
  await preview.close()
})
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === preview.url
      ? route.continue()
      : route.abort(),
  )
  await page.goto(preview.url)
})
async function fillPurchase(page: Page) {
  await page
    .getByRole('button', { name: 'Registrar compra', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Fornecedor *', { exact: true })
    .fill('Fornecedor sintético')
  await dialog.getByLabel('Produto', { exact: true }).selectOption('1')
  await dialog.getByLabel('Quantidade (kg)', { exact: true }).fill('1,5')
  await dialog
    .getByLabel('Valor total do item (R$)', { exact: true })
    .fill('12,50')
  return dialog
}
async function fillProduction(page: Page) {
  await page
    .getByRole('button', { name: 'Ensaio Produção', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Adicionar lote', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produto final', { exact: true }).selectOption('3')
  await dialog.getByLabel('Quantidade gerada', { exact: true }).fill('48')
  await dialog.getByLabel('Mão de obra total (R$)', { exact: true }).fill('10')
  await dialog.getByLabel('Energia total (R$)', { exact: true }).fill('2')
  return dialog
}
test('compra soma totais sem multiplicar kg e mantém campos ao fechar', async ({
  page,
}) => {
  let dialog = await fillPurchase(page)
  await expect(
    dialog.getByRole('region', { name: 'Resumo da compra' }),
  ).toContainText('R$ 12,50')
  await dialog
    .getByRole('button', { name: 'Adicionar item', exact: true })
    .click()
  await dialog.getByLabel('Produto', { exact: true }).nth(1).selectOption('2')
  await dialog.getByLabel('Quantidade (un.)', { exact: true }).fill('100')
  await dialog
    .getByLabel('Valor total do item (R$)', { exact: true })
    .nth(1)
    .fill('11,00')
  await expect(
    dialog.getByRole('region', { name: 'Resumo da compra' }),
  ).toContainText('R$ 23,50')
  await expect(dialog.getByLabel('Validade').first()).not.toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Registrar compra', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Quantidade (kg)')).toHaveValue('1,5')
  await dialog
    .getByRole('button', {
      name: 'Registrar compra e atualizar estoque',
      exact: true,
    })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Chamadas simuladas')).toContainText(
    '"quantity":"1,5","totalAmount":"12,50","purchaseUnit":"kg"',
  )
})
test('erro de compra preserva campos e referência de reenvio; falha de refresh mantém sucesso', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Falhar gravação', exact: true })
    .click()
  let dialog = await fillPurchase(page)
  await dialog
    .getByRole('button', {
      name: 'Registrar compra e atualizar estoque',
      exact: true,
    })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('Falha sintética')
  await expect(dialog.getByLabel('Fornecedor *')).toHaveValue(
    'Fornecedor sintético',
  )
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', { name: 'Falhar atualização', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Registrar compra', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', {
      name: 'Registrar compra e atualizar estoque',
      exact: true,
    })
    .click()
  await expect(page.getByRole('status')).toContainText(
    'Compra registrada e estoque atualizado',
  )
  const calls = JSON.parse(
    await page.getByLabel('Chamadas simuladas').innerText(),
  )
  expect(calls).toHaveLength(2)
  expect(calls[0].data.idempotencyKey).toBe(calls[1].data.idempotencyKey)
})
test('produção invalida prévia ao mudar data e adicionar ou remover saídas/perdas', async ({
  page,
}) => {
  const dialog = await fillProduction(page)
  const calculate = async () => {
    await dialog
      .getByRole('button', { name: 'Ver prévia', exact: true })
      .click()
    await expect(
      dialog.getByRole('heading', { name: 'Prévia antes do rascunho' }),
    ).toBeVisible()
  }
  await calculate()
  await dialog.getByLabel('Data do lote', { exact: true }).fill('2026-10-20')
  await expect(
    dialog.getByRole('heading', { name: 'Prévia antes do rascunho' }),
  ).toHaveCount(0)
  await calculate()
  await dialog
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  await expect(
    dialog.getByRole('heading', { name: 'Prévia antes do rascunho' }),
  ).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Remover saída' }).last().click()
  await calculate()
  await dialog
    .getByText('Perdas manuais (somente quando houver)', { exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(
    dialog.getByRole('heading', { name: 'Prévia antes do rascunho' }),
  ).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Remover perda', exact: true })
    .click()
})
test('salvar lote limpa custos e preserva estado anterior em falha', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Falhar gravação', exact: true })
    .click()
  let dialog = await fillProduction(page)
  await dialog
    .getByRole('button', { name: 'Salvar rascunho', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('Falha sintética')
  await expect(dialog.getByLabel('Mão de obra total (R$)')).toHaveValue('10')
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', { name: 'Falhar atualização', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Adicionar lote', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Salvar rascunho', exact: true })
    .click()
  await expect(page.getByRole('status')).toContainText('salvo como rascunho')
  await page
    .getByRole('button', { name: 'Adicionar lote', exact: true })
    .click()
  await expect(page.getByLabel('Mão de obra total (R$)')).toHaveValue('')
  await expect(page.getByLabel('Energia total (R$)')).toHaveValue('')
})
test('detalhes em modal e conclusão confirmada não vira falha por erro de atualização', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Ensaio Produção', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Falhar atualização', exact: true })
    .click()
  await page.getByRole('button', { name: 'Ver lote #1', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Lote #1', exact: true })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('Chamadas simuladas')).toHaveText('[]')
  page.once('dialog', (nativeDialog) => nativeDialog.accept())
  await dialog
    .getByRole('button', {
      name: 'Concluir lote e atualizar estoque',
      exact: true,
    })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText(
    'concluído e estoque atualizado',
  )
  const calls = JSON.parse(
    await page.getByLabel('Chamadas simuladas').innerText(),
  )
  expect(calls).toHaveLength(1)
  expect(calls[0].kind).toBe('complete')
})
test('compra e produção cabem no celular', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  let dialog = await fillPurchase(page)
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  )
  await page.keyboard.press('Escape')
  dialog = await fillProduction(page)
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  )
})
