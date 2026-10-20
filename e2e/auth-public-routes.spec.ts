import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context, baseURL }) => {
  if (process.env.CACAU_PUBLIC_SMOKE_ISOLATED !== '1') return
  await context.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === baseURL && ['GET', 'HEAD'].includes(request.method())) {
      await route.continue()
    } else {
      await route.abort()
    }
  })
})

test('visitante é redirecionado ao login e as rotas públicas de auth carregam', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { name: 'Entrar no Cacau', exact: true }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Primeiro acesso ou esqueci minha senha' })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Definir ou recuperar senha',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()

  await page.goto('/login/redefinir-senha', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login\/redefinir-senha$/)
  await expect(
    page.getByRole('heading', { name: 'Redefinir senha', exact: true }),
  ).toBeVisible()
})
