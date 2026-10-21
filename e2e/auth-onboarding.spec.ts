import { resolve } from 'node:path'
import { expect, test } from './isolated-test'
import { startPreview } from './preview-server'
import type { Page } from '@playwright/test'

let preview: Awaited<ReturnType<typeof startPreview>>
test.beforeAll(async () => {
  const fixture = resolve('e2e/fixtures/auth-onboarding')
  preview = await startPreview(fixture, {
    '@tanstack/react-router': resolve(fixture, 'router.ts'),
    '@tanstack/react-start': resolve(fixture, 'start.ts'),
    '#/features/auth/functions': resolve(fixture, 'state.ts'),
    '#/features/auth/session-status.functions': resolve(fixture, 'state.ts'),
    '#/features/auth/login-actions': resolve(
      'src/features/auth/login-actions.ts',
    ),
    '#/features/auth/turnstile-challenge': resolve(
      'src/features/auth/turnstile-challenge.tsx',
    ),
  })
})
test.afterAll(async () => {
  await preview.close()
})
test.beforeEach(async ({ page }) => {
  await page.goto(preview.url)
})

async function register(page: Page) {
  await page
    .getByRole('button', { name: 'Criar uma conta', exact: true })
    .click()
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa sintética')
  await page.getByLabel('E-mail', { exact: true }).fill('isolated@example.test')
  await page
    .getByLabel('Senha', { exact: true })
    .fill('synthetic-candidate-password')
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Verifique seu e-mail' }),
  ).toBeVisible()
}

async function verifyEmail(page: Page) {
  await page.getByLabel('Código de verificação').fill('123456')
  await page
    .getByRole('button', { name: 'Verificar e-mail', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Entrar no Cacau' }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(
    'isolated@example.test',
  )
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('')
}

test('conta preparada tem primeiro acesso por recuperação sem recadastro e funciona em celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByLabel('E-mail', { exact: true }).fill('isolated@example.test')
  await page
    .getByRole('button', { name: 'Primeiro acesso ou esqueci minha senha' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Definir ou recuperar senha' }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(
    'isolated@example.test',
  )
  await page
    .getByRole('button', { name: 'Enviar instruções', exact: true })
    .click()
  await expect(
    page.getByText(
      'Se houver uma conta compatível, enviaremos instruções para o e-mail informado.',
    ),
  ).toBeVisible()
  await expect(page.getByLabel('Chamadas simuladas')).toHaveText(
    '["request-password-reset"]',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('recadastro confirma e-mail sem prometer troca de senha e oferece recuperação', async ({
  page,
}) => {
  await register(page)
  await expect(
    page.getByText(
      'O código confirma seu e-mail. Ele não altera a senha de uma conta que já existia.',
    ),
  ).toBeVisible()
  await verifyEmail(page)
  await page
    .getByLabel('Senha', { exact: true })
    .fill('synthetic-candidate-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(
    page.getByText(
      'Não foi possível iniciar a sessão. Verifique as credenciais e tente novamente.',
    ),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Primeiro acesso ou esqueci minha senha' })
    .click()
  await page
    .getByRole('button', { name: 'Enviar instruções', exact: true })
    .click()
  await expect(page.getByLabel('Chamadas simuladas')).toHaveText(
    '["sign-up","send-verification","verify-email","sign-in","request-password-reset"]',
  )
})

test('cadastro de conta nova permite entrar com a senha inicial após OTP', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Simular conta nova' }).click()
  await register(page)
  await verifyEmail(page)
  await page
    .getByLabel('Senha', { exact: true })
    .fill('synthetic-candidate-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByLabel('Chamadas simuladas')).toHaveText(
    '["sign-up","send-verification","verify-email","sign-in","navigate:/"]',
  )
})

test('OTP inválido permanece na verificação e permite voltar ou recuperar acesso', async ({
  page,
}) => {
  await register(page)
  await page.getByLabel('Código de verificação').fill('000000')
  await page
    .getByRole('button', { name: 'Verificar e-mail', exact: true })
    .click()
  await expect(
    page.getByText(
      'Não foi possível verificar o código. Solicite um novo código e tente novamente.',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Verifique seu e-mail' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Primeiro acesso ou esqueci minha senha' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Definir ou recuperar senha' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Voltar para entrar' }).click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('')
})
