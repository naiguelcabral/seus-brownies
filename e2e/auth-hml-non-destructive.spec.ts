import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type AuthorizedIdentity = {
  email: string
  password: string
}

type AuthorizedHmlInputs = {
  identities: {
    owner: AuthorizedIdentity
    noAllowlist: AuthorizedIdentity
    inactive: AuthorizedIdentity
    insufficientRole: AuthorizedIdentity
    unverified: AuthorizedIdentity
  }
}

function requireIdentity(
  value: unknown,
  name: string,
): asserts value is AuthorizedIdentity {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as AuthorizedIdentity).email !== 'string' ||
    typeof (value as AuthorizedIdentity).password !== 'string'
  ) {
    throw new Error(`Entrada humana autorizada ausente ou inválida: ${name}.`)
  }
}

function loadAuthorizedHmlInputs(): AuthorizedHmlInputs {
  const serialized = process.env.CACAU_HML_AUTH_E2E_INPUT
  if (!serialized) {
    throw new Error(
      'Execução HML recusada: forneça CACAU_HML_AUTH_E2E_INPUT somente no gate humano.',
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    throw new Error('Entrada humana autorizada inválida.')
  }

  const identities =
    parsed && typeof parsed === 'object'
      ? (parsed as { identities?: unknown }).identities
      : undefined
  if (!identities || typeof identities !== 'object') {
    throw new Error('Entrada humana autorizada sem identidades.')
  }

  const required = identities as Record<string, unknown>
  requireIdentity(required.owner, 'owner')
  requireIdentity(required.noAllowlist, 'noAllowlist')
  requireIdentity(required.inactive, 'inactive')
  requireIdentity(required.insufficientRole, 'insufficientRole')
  requireIdentity(required.unverified, 'unverified')

  return { identities: required as AuthorizedHmlInputs['identities'] }
}

const inputs = loadAuthorizedHmlInputs()

async function login(page: Page, identity: AuthorizedIdentity) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByLabel('E-mail').fill(identity.email)
  await page.getByLabel('Senha').fill(identity.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test.describe.configure({ mode: 'serial' })

test('navegação pública HML mantém login como destino canônico', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { name: 'Entrar no Cacau', exact: true }),
  ).toBeVisible()
})

test('Dono autorizado autentica, preserva sessão e encerra sessão', async ({
  page,
}) => {
  await login(page, inputs.identities.owner)
  await expect(page).not.toHaveURL(/\/login(?:$|\/)/)
  await expect(
    page.getByRole('button', { name: 'Sair', exact: true }),
  ).toBeVisible()

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page).not.toHaveURL(/\/login(?:$|\/)/)

  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('identidade sem allowlist permanece negada após autenticação', async ({
  page,
}) => {
  await login(page, inputs.identities.noAllowlist)
  await expect(
    page.getByText(/ainda não possui acesso ao Cacau/i),
  ).toBeVisible()
})

test('vínculo inativo permanece negado após autenticação', async ({ page }) => {
  await login(page, inputs.identities.inactive)
  await expect(
    page.getByText(/ainda não possui acesso ao Cacau/i),
  ).toBeVisible()
})

test('e-mail não verificado permanece no fluxo de confirmação', async ({
  page,
}) => {
  await login(page, inputs.identities.unverified)
  await expect(
    page.getByRole('heading', { name: 'Verifique seu e-mail', exact: true }),
  ).toBeVisible()
})

test('papel insuficiente não acessa relatório protegido', async ({ page }) => {
  await login(page, inputs.identities.insufficientRole)
  await page.goto('/relatorios', { waitUntil: 'networkidle' })
  await expect(
    page.getByText(/não foi possível carregar os indicadores/i),
  ).toBeVisible()
})

test.fixme(
  true,
  'OTP real é uma etapa humana: não consumir código nem alterar identidade por esta spec',
)

test.fixme(
  true,
  'recuperação real é uma etapa humana: não solicitar ou redefinir senha por esta spec',
)

test.fixme(
  true,
  'auditoria persistida é conferida por operador autorizado, sem consulta automática ao HML',
)

test.fixme(
  true,
  'atributos do cookie são conferidos manualmente, sem coletar ou registrar seu valor',
)
