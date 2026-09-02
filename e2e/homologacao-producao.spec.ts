import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

async function selectByText(select: Locator, text: RegExp) { const option = select.locator('option').filter({ hasText: text }).first(); await select.selectOption((await option.getAttribute('value')) ?? '') }
async function loggedStep(name: string, action: () => Promise<void>) { console.log(`INÍCIO: ${name}`); await test.step(name, action); console.log(`FIM: ${name}`) }

test.skip('compra e entrada no estoque', async ({ page }) => {
  const prefix = 'HML-20260829-COMPRA-01'
  await loggedStep('abrir compras', async () => { await page.goto('/compras', { waitUntil: 'networkidle' }); await expect(page.locator('main').getByRole('heading', { name: 'Compras', exact: true })).toBeVisible() })
  await loggedStep('registrar compra HML', async () => { await page.getByLabel('Fornecedor *').fill(`${prefix} insumos`); const item = page.locator('form').last().locator('.rounded-xl').first(); await selectByText(item.getByLabel('Produto'), /Açúcar/); await item.getByLabel('Quantidade').fill('100'); await item.getByLabel('Custo unitário').fill('1'); await page.getByLabel('Observações').fill(prefix); await page.getByRole('button', { name: 'Registrar compra' }).click(); await expect(page.getByText('Compra registrada e estoque atualizado.')).toBeVisible(); await expect(page.getByText(`${prefix} insumos`)).toBeVisible() })
  await loggedStep('conferir entrada no estoque', async () => { await page.goto('/estoque', { waitUntil: 'networkidle' }); await expect(page.getByText(/Açúcar/).first()).toBeVisible(); await expect(page.getByText(/compra/i).first()).toBeVisible() })
})

test.skip('criação e prévia do lote', async ({ page }) => {
  const prefix = 'HML-20260829-LOTE-01'
  await loggedStep('comprar insumos complementares', async () => {
    await page.goto('/compras', { waitUntil: 'networkidle' })
    await page.getByLabel('Fornecedor *').fill(`${prefix} insumos`)
    const items = [['Açúcar', '500'], ['Farinha de Trigo', '240'], ['Ovos Grandes', '8'], ['Óleo', '215'], ['Chocolate', '300'], ['Papel Manteiga', '0.8'], ['Brigadeiro (Recheio)', '20'], ['Embalagem Recheado 5x5', '1']]
    for (let index = 0; index < items.length; index += 1) {
      if (index) await page.getByRole('button', { name: 'Adicionar item' }).click()
      const item = page.locator('form').last().locator('.rounded-xl').nth(index)
      await selectByText(item.getByLabel('Produto'), new RegExp(items[index][0], 'i'))
      await item.getByLabel('Quantidade').fill(items[index][1])
      await item.getByLabel('Custo unitário').fill('1')
    }
    await page.getByLabel('Observações').fill(prefix)
    await page.getByRole('button', { name: 'Registrar compra' }).click()
    await expect(page.getByText('Compra registrada e estoque atualizado.')).toBeVisible()
  })
  await loggedStep('gerar prévia e salvar rascunho', async () => {
    await page.goto('/producao', { waitUntil: 'networkidle' })
    const form = page.locator('form')
    await selectByText(form.getByLabel('Produto final'), /Brownie Recheado 5x5 \(Brigadeiro\)/)
    await form.getByLabel('Quantidade gerada').fill('1')
    await form.getByRole('button', { name: 'Ver prévia' }).click()
    await expect(page.getByText('Bordinhas sugeridas:')).toBeVisible()
    await expect(page.getByText('Custos operacionais vigentes')).toBeVisible()
    await form.getByLabel('Observações').fill(prefix)
    await form.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.getByText(/criado como rascunho/)).toBeVisible()
    const text = await page.getByText(/Lote #\d+/).first().textContent()
    console.log(`LOTE HML VISÍVEL: ${text}`)
  })
})
test.skip('conclusão do lote e conferência de custos', () => {})
test.skip('venda paga e baixa de estoque', () => {})
test.skip('despesa', () => {})
test.skip('validações de erro', () => {})
