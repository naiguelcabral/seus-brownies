import { test, expect } from './isolated-test'
import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  preview = await startPreview('e2e/fixtures/scenario-ux')
})
test.afterAll(async () => {
  await preview.close()
})
test('meta conjunta aparece primeiro e os detalhes podem ser consultados', async ({
  page,
}) => {
  await page.goto(preview.url)
  await expect(
    page.getByText('Meta de lucro mensal após custos', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('R$ 10.000,00', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Sem criar cotas obrigatórias', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('columnheader', { name: 'Mix orientativo' }),
  ).not.toBeVisible()
  await page.getByText('Mix e estimativas por produto', { exact: true }).click()
  await expect(
    page.getByRole('columnheader', { name: 'Mix orientativo' }),
  ).toBeVisible()
  await expect(
    page.getByText('Dado ausente para o período de vigência.'),
  ).toBeVisible()
})
test('prévia normaliza 103% e mantém valores ao fechar e após conflito', async ({
  page,
}) => {
  await page.goto(preview.url)
  const trigger = page.getByRole('button', {
    name: 'Editar rascunho',
    exact: true,
  })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('region', { name: 'Prévia do rascunho' }),
  ).toContainText('100,00%')
  await expect(
    dialog.getByRole('region', { name: 'Prévia do rascunho' }),
  ).toContainText('32,04%')
  await page.getByLabel('Nome', { exact: true }).fill('Rascunho preservado')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(
    'Rascunho preservado',
  )
  await dialog
    .getByRole('button', { name: 'Salvar rascunho', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('Conflito de revisão')
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(
    'Rascunho preservado',
  )
  await page.getByLabel('Custo unitário planejado (R$)').first().fill('99')
  await expect(
    dialog.getByRole('region', { name: 'Prévia do rascunho' }),
  ).toContainText('não possui contribuição positiva')
})
test('ativação exige motivo, não grava ao abrir e preserva erro sem duplo envio', async ({
  page,
}) => {
  await page.goto(preview.url)
  await page.getByRole('button', { name: 'activate', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Cenário anterior')
  await expect(page.getByRole('status', { includeHidden: true })).toHaveText(
    'Chamadas sintéticas: 0',
  )
  await dialog.getByRole('button', { name: 'Confirmar ativação' }).click()
  await expect(dialog.getByRole('alert')).toContainText('pelo menos três')
  await page.getByLabel('Motivo', { exact: true }).fill('Revisado no ensaio')
  await dialog.getByRole('button', { name: 'Confirmar ativação' }).dblclick()
  await expect(dialog.getByRole('alert')).toContainText(
    'Conflito de revisão sintético',
  )
  await expect(page.getByRole('status', { includeHidden: true })).toHaveText(
    'Chamadas sintéticas: 1',
  )
  await expect(page.getByLabel('Motivo')).toHaveValue('Revisado no ensaio')
})
test('arquivamento e cópia explicam efeitos e cancelamento não executa ação', async ({
  page,
}) => {
  await page.goto(preview.url)
  await page.getByRole('button', { name: 'archive', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'deixará de orientar as metas',
  )
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('button', { name: 'version', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'mesmas premissas e produtos',
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status', { includeHidden: true })).toHaveText(
    'Chamadas sintéticas: 0',
  )
})
test('resumo e editor cabem no celular com detalhes expansíveis', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(preview.url)
  await page.getByText('Mix e estimativas por produto', { exact: true }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .getByRole('button', { name: 'Editar rascunho', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
  await expect(
    dialog.getByRole('button', { name: 'Salvar rascunho', exact: true }),
  ).toBeVisible()
})
