# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hml-sale-correction.spec.ts >> registra a venda HML de correcao pela interface
- Location: e2e/hml-sale-correction.spec.ts:5:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Venda registrada e estoque baixado.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Venda registrada e estoque baixado.')

```

```yaml
- main:
  - link "C Seus Brownies Cacau":
    - /url: /
  - navigation "Navegação do cadastro":
    - link "Visão geral":
      - /url: /
    - link "Categorias":
      - /url: /categorias
    - link "Produtos":
      - /url: /produtos
    - link "Compras":
      - /url: /compras
    - link "Estoque":
      - /url: /estoque
    - link "Produção":
      - /url: /producao
    - link "Vendas":
      - /url: /vendas
    - link "Despesas":
      - /url: /despesas
    - link "Relatórios":
      - /url: /relatorios
  - paragraph: Cadastro
  - heading "Vendas" [level=1]
  - paragraph: Registre pedidos e vendas. A baixa no estoque é criada automaticamente somente para vendas confirmadas ou pagas.
  - heading "Vendas recentes" [level=2]
  - list:
    - listitem:
      - paragraph: HML-20260829-VENDA-01
      - paragraph: Confirmada · 29/08/2026, 20:09
      - strong: R$ 12,00
  - heading "Nova venda" [level=2]
  - text: Cliente
  - textbox "Cliente"
  - text: Telefone
  - textbox "Telefone"
  - text: Status
  - combobox "Status":
    - option "Rascunho" [selected]
    - option "Confirmada"
    - option "Paga"
    - option "Cancelada"
  - strong: Item 1
  - text: Produto
  - combobox "Produto":
    - option "Selecione" [selected]
    - option "Bombom Brownie Unitário · R$ 5,00"
    - option "Bordinhas · R$ 5,00"
    - option "Brownie Recheado 5x5 (Brigadeiro) · R$ 12,00"
    - option "Brownie Recheado 5x5 (Creme de Avelã) · R$ 12,00"
    - option "Brownie Recheado 5x5 (Doce de Leite) · R$ 12,00"
    - option "Brownie Recheado 5x5 (Goiabada) · R$ 12,00"
    - option "Brownie Recheado 5x5 (Leite Ninho) · R$ 12,00"
    - option "Brownie Recheado 5x5 (Maracujá) · R$ 12,00"
    - option "Brownie Recheado 7x7 (Brigadeiro) · R$ 17,00"
    - option "Brownie Recheado 7x7 (Creme de avelã) · R$ 17,00"
    - option "Brownie Recheado 7x7 (Doce de Leite) · R$ 17,00"
    - option "Brownie Recheado 7x7 (Goiabada) · R$ 17,00"
    - option "Brownie Recheado 7x7 (Leite Ninho) · R$ 17,00"
    - option "Brownie Recheado 7x7 (Maracujá) · R$ 17,00"
    - option "Brownie Simples 5x5 · R$ 6,00"
    - option "Brownie Simples 7x7 · R$ 8,00"
    - option "Kit 4 Bombons · R$ 18,00"
  - text: Quantidade
  - textbox "Quantidade":
    - /placeholder: "Ex.: 2,000"
  - button "Adicionar item"
  - text: Observações
  - textbox "Observações"
  - button "Registrar venda"
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | const prefix = 'HML-20260829-VENDA-CORRECAO-01'
  4  | 
  5  | test('registra a venda HML de correcao pela interface', async ({ page }) => {
  6  |   const consoleErrors: string[] = []
  7  |   page.on('console', (message) => {
  8  |     if (message.type() === 'error') consoleErrors.push(message.text())
  9  |   })
  10 | 
  11 |   await page.goto('/vendas')
  12 |   await expect(
  13 |     page.getByRole('heading', { name: 'Vendas', exact: true }),
  14 |   ).toBeVisible()
  15 |   await expect(page.getByRole('heading', { name: 'Nova venda' })).toBeVisible()
  16 |   await expect(page.locator('body')).not.toContainText(prefix)
  17 | 
  18 |   const productOption = page.locator('select').nth(1).locator('option[value="3"]')
  19 |   await expect(productOption).toContainText('Brownie Recheado 5x5 (Brigadeiro)')
  20 |   expect((await productOption.textContent())?.replace(/\u00a0/g, ' ')).toContain('R$ 12,00')
  21 | 
  22 |   await page.getByLabel('Cliente').fill(prefix)
  23 |   await page.getByLabel('Status').selectOption('confirmed')
  24 |   await page.locator('select').nth(1).selectOption('3')
  25 |   await page.getByLabel('Quantidade').fill('1')
  26 |   await page.getByLabel('Observações').fill(prefix)
  27 |   await page.getByRole('button', { name: 'Registrar venda' }).click()
  28 | 
> 29 |   await expect(page.getByText('Venda registrada e estoque baixado.')).toBeVisible()
     |                                                                       ^ Error: expect(locator).toBeVisible() failed
  30 |   await expect(page.getByText(prefix).first()).toBeVisible()
  31 |   await page.screenshot({
  32 |     path: 'test-results/hml-venda-correcao/sucesso-venda-correcao.png',
  33 |     fullPage: true,
  34 |   })
  35 |   expect(consoleErrors.filter((message) => message.includes('42703'))).toEqual([])
  36 | })
  37 | 
```