import { expect, test } from '@playwright/test'

test('pré-checagem visual de estoque para produção', async ({ page }) => {
  const consoleMessages: Array<{ type: string; text: string; location: string }> = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      const location = message.location()
      consoleMessages.push({ type: message.type(), text: message.text(), location: `${location.url}:${location.lineNumber}:${location.columnNumber}` })
    }
  })
  await test.step('selecionar saída sem gravar', async () => {
    await page.goto('/producao', { waitUntil: 'networkidle' })
    const form = page.locator('form')
    const select = form.getByLabel('Produto final')
    const option = select.locator('option').filter({ hasText: /Brownie Recheado 5x5 \(Brigadeiro\)/ }).first()
    await select.selectOption((await option.getAttribute('value')) ?? '')
    await form.getByLabel('Quantidade gerada').fill('1')
    await form.getByRole('button', { name: 'Ver prévia' }).click()
    await expect(page.getByText('Bordinhas sugeridas:')).toBeVisible()
  })
  await test.step('ler insumos e suficiência', async () => {
    const rows = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Insumos e estoque' }) }).locator('li')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      const text = (await rows.nth(index).innerText()).replace(/\s+/g, ' ').trim()
      expect(text).toMatch(/disponível/)
      expect(text).toMatch(/(insuficiente|\d)/)
      console.log(`INSUMO ${index + 1}: ${text}`)
    }
    console.log(`BORDINHAS: ${await page.getByText('Bordinhas sugeridas:').locator('..').innerText()}`)
    const costs = page.getByText('Custos operacionais vigentes').locator('..')
    await expect(costs).toBeVisible()
    console.log(`CUSTOS: ${await costs.innerText()}`)
  })
  console.log(`CONSOLE: ${JSON.stringify(consoleMessages)}`)
  expect(consoleMessages.filter((message) => /unique "key"/i.test(message.text))).toEqual([])
})
