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
  const loginResponse = await page.goto('/', { waitUntil: 'networkidle' })
  expect(loginResponse?.headers()['cache-control']).toBe('no-store')
  expect(loginResponse?.headers()['referrer-policy']).toBe('no-referrer')
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

  const resetResponse = await page.goto('/login/redefinir-senha', {
    waitUntil: 'networkidle',
  })
  expect(resetResponse?.headers()['cache-control']).toBe('no-store')
  expect(resetResponse?.headers()['referrer-policy']).toBe('no-referrer')
  for (const response of [loginResponse, resetResponse]) {
    expect(response?.headers()['x-frame-options']).toBe('DENY')
    expect(response?.headers()['x-content-type-options']).toBe('nosniff')
    expect(
      response?.headers()['content-security-policy-report-only'],
    ).toContain('https://challenges.cloudflare.com')
  }
  await expect(page).toHaveURL(/\/login\/redefinir-senha$/)
  await expect(
    page.getByRole('heading', { name: 'Redefinir senha', exact: true }),
  ).toBeVisible()
})

test('excessive request body is rejected by global middleware before routing', async ({
  request,
  baseURL,
}) => {
  const response = await request.post('/login', {
    data: 'x'.repeat(1024 * 1024 + 1),
    headers: {
      origin: baseURL ?? '',
      'sec-fetch-site': 'same-origin',
      'content-type': 'text/plain',
    },
  })
  expect(response.status()).toBe(413)
  expect(await response.json()).toEqual({ error: 'payload_too_large' })
  expect(response.headers()['x-frame-options']).toBe('DENY')
})
