import { test, expect } from '@playwright/test'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, extname } from 'node:path'

let temporaryDirectory: string
let baseURL: string
const server = createServer()

test.beforeAll(async () => {
  temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'cacau-product-editor-'))
  // Explicit config and empty env directory: no application config, auth or .env.
  await build({
    configFile: false,
    root: resolve('e2e/fixtures/product-editor'),
    envDir: temporaryDirectory,
    plugins: [react(), tailwindcss()],
    logLevel: 'error',
    build: { outDir: resolve(temporaryDirectory, 'dist'), emptyOutDir: true },
  })
  server.on('request', (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    const file = resolve(
      temporaryDirectory,
      'dist',
      path === '/' ? 'index.html' : path.slice(1),
    )
    if (!file.startsWith(resolve(temporaryDirectory, 'dist') + '/')) {
      response.writeHead(403).end()
      return
    }
    void readFile(file)
      .then((body) => {
        response.setHeader(
          'Content-Type',
          extname(file) === '.js'
            ? 'text/javascript'
            : extname(file) === '.css'
              ? 'text/css'
              : 'text/html',
        )
        response.end(body)
      })
      .catch(() => response.writeHead(404).end())
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Servidor local indisponível.')
  baseURL = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => {
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  )
  if (temporaryDirectory)
    await rm(temporaryDirectory, { recursive: true, force: true })
})

test.beforeEach(async ({ page }) => {
  await page.goto(baseURL)
})

test('abre, contém o foco, fecha com Escape e devolve foco ao botão', async ({
  page,
}) => {
  const trigger = page.getByRole('button', {
    name: 'Adicionar produto',
    exact: true,
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await trigger.click()
  const dialog = page.getByRole('dialog', {
    name: 'Adicionar produto',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  const desktopBox = await dialog.boundingBox()
  expect(desktopBox?.x).toBeGreaterThan(0)
  expect(desktopBox?.width).toBeLessThanOrEqual(672)
  await expect(dialog.getByLabel('Nome *', { exact: true })).toBeFocused()
  for (let index = 0; index < 15; index++) {
    await page.keyboard.press('Tab')
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('preserva valores no erro, confirma descarte e permite corrigir e salvar', async ({
  page,
}) => {
  await page.getByLabel('Resultado do salvamento').selectOption('retry')
  await page
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('Preencha nome e SKU')
  await dialog.getByLabel('Nome *', { exact: true }).fill('Brownie novo')
  await dialog.getByLabel('SKU *', { exact: true }).fill('qa-novo')
  await dialog
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('preço de venda')
  await dialog.getByLabel('Preço de venda *', { exact: true }).fill('15,50')
  await dialog
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('SKU já cadastrado')
  await expect(dialog.getByLabel('Nome *', { exact: true })).toHaveValue(
    'Brownie novo',
  )
  page.once('dialog', (confirmation) => confirmation.dismiss())
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('SKU *', { exact: true }).fill('QA-CORRIGIDO')
  await dialog
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('saved')).toContainText('QA-CORRIGIDO')
  await expect(page.getByTestId('calls')).toHaveText('2')
})

test('permite ingrediente sem preço e impede fechar ou reenviar enquanto salva', async ({
  page,
}) => {
  await page.getByLabel('Resultado do salvamento').selectOption('slow')
  await page
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Nome *', { exact: true })
    .fill('Ingrediente de ensaio')
  await dialog.getByLabel('SKU *', { exact: true }).fill('QA-ING')
  await dialog
    .getByRole('combobox', { name: 'Tipo', exact: true })
    .selectOption('ingredient')
  await dialog
    .getByRole('button', { name: 'Adicionar produto', exact: true })
    .click()
  await expect(
    dialog.getByRole('button', { name: 'Salvando...' }),
  ).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('calls')).toHaveText('1')
  await expect(page.getByTestId('saved')).toContainText('"salePrice":""')
})

test('edita com campos opcionais preservados e cabe em tela móvel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Editar Brownie de ensaio' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar produto' })
  await expect(dialog.getByLabel('Nome *', { exact: true })).toHaveValue(
    'Brownie de ensaio',
  )
  await expect(
    dialog.getByRole('textbox', { name: 'Descrição', exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByRole('textbox', {
      name: 'Fornecedor padrão (opcional)',
      exact: true,
    }),
  ).toHaveValue('Fornecedor de ensaio')
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.width).toBeLessThanOrEqual(390)
  expect(box?.x).toBeGreaterThan(0)
  expect(box?.height).toBeLessThanOrEqual(760)
  await page.screenshot({ path: '/tmp/cacau-product-editor-mobile.png' })
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('saved')).toContainText('Somente ensaio local')
})

test('confirma descarte, reabre cadastro limpo e registra visual desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const trigger = page.getByRole('button', {
    name: 'Adicionar produto',
    exact: true,
  })
  await trigger.click()
  await page.getByLabel('Nome *', { exact: true }).fill('Não salvar')
  page.once('dialog', (confirmation) => confirmation.accept())
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await trigger.click()
  await expect(page.getByLabel('Nome *', { exact: true })).toHaveValue('')
  await expect(
    page.getByRole('textbox', { name: 'Descrição', exact: true }),
  ).not.toBeVisible()
  await page.screenshot({ path: '/tmp/cacau-product-editor-desktop.png' })
})
