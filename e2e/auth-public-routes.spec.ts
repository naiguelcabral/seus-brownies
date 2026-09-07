import { expect, test } from '@playwright/test'

test('visitante é redirecionado ao login e as rotas públicas de auth carregam', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { name: 'Entrar no Cacau', exact: true }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
  await expect(
    page.getByRole('heading', { name: 'Recuperar senha', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()

  await page.goto('/login/redefinir-senha', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login\/redefinir-senha$/)
  await expect(
    page.getByRole('heading', { name: 'Redefinir senha', exact: true }),
  ).toBeVisible()
})
