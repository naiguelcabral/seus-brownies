import { expect, test } from '@playwright/test'

test('auditoria visual HML-20260829-LOTE-01', async ({ page }) => {
  const prefix = 'HML-20260829-LOTE-01'
  await test.step('procurar compra complementar', async () => {
    await page.goto('/compras', { waitUntil: 'networkidle' })
    console.log(`COMPRA_VISIVEL=${await page.getByText(new RegExp(prefix)).count()}`)
  })
  await test.step('ler estoque dos oito itens', async () => {
    await page.goto('/estoque', { waitUntil: 'networkidle' })
    for (const name of ['Açúcar', 'Farinha de Trigo', 'Ovos Grandes', 'Óleo', 'Chocolate', 'Papel Manteiga', 'Brigadeiro (Recheio)', 'Embalagem Recheado 5x5']) {
      const row = page.locator('tr').filter({ hasText: name }).first()
      await expect(row).toBeVisible()
      console.log(`ESTOQUE ${name}: ${(await row.innerText()).replace(/\s+/g, ' ')}`)
    }
    console.log(`MOVIMENTO_HML_VISIVEL=${await page.getByText(new RegExp(prefix)).count()}`)
  })
})
