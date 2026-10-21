import { test, expect } from './isolated-test'
import { startPreview } from './preview-server'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  preview = await startPreview('e2e/fixtures/catalog-editors')
})
test.afterAll(async () => {
  await preview.close()
})
test.beforeEach(async ({ page }) => {
  await page.goto(preview.url)
})
for (const kind of ['categoria', 'local']) {
  test(`${kind}: valida nome, mantém dados após erro e salva na segunda tentativa`, async ({
    page,
  }) => {
    await page.getByLabel('Resultado do salvamento').selectOption('retry')
    await page.getByRole('button', { name: `Abrir ${kind}` }).click()
    const dialog = page.getByRole('dialog')
    const submit = dialog.getByRole('button', {
      name: `Adicionar ${kind}`,
      exact: true,
    })
    await submit.click()
    await expect(page.getByRole('alert')).toContainText(
      'pelo menos 2 caracteres',
    )
    await expect(page.getByTestId('calls')).toHaveText('0')
    await dialog
      .getByLabel('Nome *', { exact: true })
      .fill('Cadastro de ensaio')
    await submit.click()
    await expect(page.getByRole('alert')).toContainText('Falha de ensaio')
    await expect(dialog.getByLabel('Nome *', { exact: true })).toHaveValue(
      'Cadastro de ensaio',
    )
    await submit.click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('calls')).toHaveText('2')
    await expect(page.getByTestId('saved')).toContainText('Cadastro de ensaio')
  })
  test(`${kind}: confirma descarte, restaura foco e reabre limpo`, async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: `Abrir ${kind}` })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Nome *', { exact: true })).toBeFocused()
    await dialog.getByLabel('Nome *', { exact: true }).fill('Não salvar')
    page.once('dialog', (confirmation) => confirmation.dismiss())
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    page.once('dialog', (confirmation) => confirmation.accept())
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await trigger.click()
    await expect(dialog.getByLabel('Nome *', { exact: true })).toHaveValue('')
  })
  test(`${kind}: preserva edição, contém foco e cabe no celular`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByLabel('Editar existente').check()
    await page.getByRole('button', { name: `Abrir ${kind}` }).click()
    const dialog = page.getByRole('dialog')
    if (kind === 'categoria') {
      await expect(dialog.getByLabel('Descrição (opcional)')).toHaveValue(
        'Descrição preservada',
      )
    } else {
      await expect(
        dialog.getByRole('combobox', { name: 'Tipo', exact: true }),
      ).toHaveValue('event')
      await expect(dialog.getByLabel('Frequência (opcional)')).toHaveValue(
        'Sábados',
      )
      await expect(dialog.getByLabel('Observação (opcional)')).toHaveValue(
        'Observação preservada',
      )
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true)
    }
    const box = await dialog.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(390)
    expect(box?.x).toBeGreaterThan(0)
    expect(box?.height).toBeLessThanOrEqual(760)
    await page.screenshot({ path: `/tmp/cacau-${kind}-editor-mobile.png` })
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('saved')).toContainText('preservada')
  })
  test(`${kind}: impede fechar e repetir envio enquanto salva`, async ({
    page,
  }) => {
    await page.getByLabel('Resultado do salvamento').selectOption('slow')
    await page.getByRole('button', { name: `Abrir ${kind}` }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByLabel('Nome *', { exact: true })
      .fill('Cadastro de ensaio')
    await dialog
      .getByRole('button', { name: `Adicionar ${kind}`, exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Salvando...' }),
    ).toBeDisabled()
    await expect(
      dialog.getByRole('button', { name: 'Cancelar' }),
    ).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('calls')).toHaveText('1')
  })
}
