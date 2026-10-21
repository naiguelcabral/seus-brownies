import { expect, test } from '@playwright/test'
import pg from 'pg'

const origin = 'http://127.0.0.1:4178'
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5440,
  user: 'connected_fixture',
  password: 'synthetic-connected-only',
  database: 'cacau_connected',
  max: 2,
})
test.describe.configure({ mode: 'serial' })
test.afterAll(async () => {
  await pool.end()
})
test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  )
  await context.routeWebSocket('**/*', (socket) => socket.close())
})

async function identity(page, role) {
  await page.context().clearCookies()
  if (role)
    await page.context().addCookies([
      {
        name: 'cacau-connected-qa',
        value: role,
        url: origin,
        httpOnly: true,
        sameSite: 'Strict',
      },
    ])
  await page.goto('/login', { waitUntil: 'networkidle' })
}
async function rpc(page, functionName, inputData = {}) {
  return page.evaluate(
    async ({ name, data }) => {
      const { functions } = await import('/e2e/connected/bridge.ts')
      try {
        return { ok: true, value: await functions[name]({ data }) }
      } catch (error) {
        return { ok: false, message: error.message }
      }
    },
    { name: functionName, data: inputData },
  )
}
async function counters() {
  return (
    await pool.query(
      `select (select count(*) from purchases)::int purchases,(select count(*) from production_batches)::int batches,(select count(*) from sales)::int sales,(select count(*) from stock_movements)::int movements,(select count(*) from financial_events)::int events,(select count(*) from operational_audit_events)::int audit`,
    )
  ).rows[0]
}

test('anonymous, inactive, unverified and missing access links cannot call protected endpoints', async ({
  page,
}) => {
  for (const role of [null, 'inactive', 'unverified', 'no-access']) {
    await identity(page, role)
    const before = await counters()
    for (const name of [
      'listPurchasableProducts',
      'getDashboard',
      'createPurchase',
      'getOperationalReports',
    ]) {
      const result = await rpc(page, name)
      expect(result.ok, `${role}: ${name}`).toBe(false)
      expect(result.message).toMatch(/Autenticação|Confirme o e-mail/)
    }
    expect(await counters()).toEqual(before)
    await page.goto('/financeiro')
    await expect(page).toHaveURL(/\/login$/)
  }
})

// Independent business expectations, deliberately not calculated by hasPermission.
const allowed = {
  owner: null,
  manager: [
    'catalog:read',
    'catalog:write',
    'purchases:read',
    'purchases:write',
    'inventory:read',
    'sales:read',
    'sales:write',
    'expenses:read',
    'expenses:write',
    'production:read',
    'production:write',
    'reports:financial:read',
    'dashboard:read',
    'financial:compensation:write',
    'scenarios:read',
  ],
  production: [
    'catalog:read',
    'inventory:read',
    'production:read',
    'production:write',
  ],
  employee: ['catalog:read', 'purchases:write', 'sales:write'],
}
for (const role of Object.keys(allowed)) {
  test(`${role}: every forbidden RPC rejects and has no operational effect`, async ({
    page,
  }) => {
    await identity(page, role)
    const policies = await page.evaluate(
      async () =>
        (await import('/e2e/connected/bridge.ts')).serverFunctionPolicies,
    )
    expect(Object.keys(policies)).toHaveLength(55)
    const before = await counters()
    for (const [name, permission] of Object.entries(policies)) {
      if (allowed[role] === null || allowed[role].includes(permission)) continue
      const result = await rpc(page, name)
      expect(result.ok, `${role}: ${name}`).toBe(false)
      expect(result.message, `${role}: ${name}`).toMatch(/não tem permissão/)
    }
    expect(await counters()).toEqual(before)
    const readable = await rpc(page, 'listPurchasableProducts')
    expect(readable.ok).toBe(true)
    await page.goto('/compras')
    if (role === 'production')
      await expect(page).toHaveURL(/\/produtos(?:\?|$)/)
    else
      await expect(
        page.getByRole('button', { name: 'Registrar compra', exact: true }),
      ).toBeVisible()
    await page.goto('/relatorios')
    if (['owner', 'manager'].includes(role))
      await expect(page).toHaveURL(/\/relatorios$/)
    else await expect(page).not.toHaveURL(/\/relatorios$/)
  })
}

test('real UI and PostgreSQL: purchase, batch, sale, receipt, delivery, profit, mobile and CSV', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await identity(page, 'owner')
  await page.goto('/compras', { waitUntil: 'networkidle' })
  await page
    .getByRole('button', { name: 'Registrar compra', exact: true })
    .click()
  let dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Fornecedor *', { exact: true })
    .fill('Fornecedor QA isolado')
  await dialog.getByLabel('Produto', { exact: true }).selectOption('1')
  await dialog.getByLabel('Quantidade (kg)', { exact: true }).fill('1')
  await dialog
    .getByLabel('Valor total do item (R$)', { exact: true })
    .fill('12,50')
  await dialog
    .getByRole('button', {
      name: 'Registrar compra e atualizar estoque',
      exact: true,
    })
    .click()
  await expect(dialog).toHaveCount(0)
  expect(
    (await pool.query('select quantity_delta,exact_cost from stock_movements'))
      .rows,
  ).toHaveLength(1)
  await page.goto('/producao', { waitUntil: 'networkidle' })
  await page
    .getByRole('button', { name: 'Adicionar lote', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Produto final', { exact: true }).selectOption('2')
  await dialog.getByLabel('Quantidade gerada', { exact: true }).fill('12')
  await dialog.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  await expect(
    dialog.getByRole('heading', { name: 'Prévia antes do rascunho' }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Salvar rascunho', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver lote #1', exact: true }).click()
  page.once('dialog', (confirmation) => confirmation.accept())
  await page
    .getByRole('button', {
      name: 'Concluir lote e atualizar estoque',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Lote #1 · Concluído', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Fechar', exact: true })
    .click()
  expect((await rpc(page, 'completeProductionBatch', { id: 1 })).ok).toBe(false)
  await page.goto('/vendas', { waitUntil: 'networkidle' })
  await page
    .getByRole('button', { name: 'Registrar venda', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Cliente', { exact: true }).fill('Cliente sintético')
  await dialog
    .getByRole('combobox', { name: /^Local ou canal/ })
    .selectOption('1')
  await dialog
    .getByRole('combobox', { name: /^Status/ })
    .selectOption('confirmed')
  await dialog.getByRole('combobox', { name: /^Produto/ }).selectOption('2')
  await dialog.getByLabel('Quantidade', { exact: true }).fill('2')
  await dialog
    .getByLabel('Valor bruto da venda (antes da taxa)', { exact: true })
    .fill('20,00')
  await dialog
    .getByRole('button', { name: 'Registrar venda', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Registrar recebimento', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog
    .getByRole('combobox', { name: /^Meio de pagamento/ })
    .selectOption('pix')
  await dialog
    .getByRole('button', { name: 'Confirmar recebimento', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Registrar entrega', exact: true })
    .click()
  await page.getByRole('checkbox', { name: /Confirmo a entrega/ }).check()
  await page
    .getByRole('button', { name: 'Confirmar entrega', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Registrar entrega', exact: true }),
  ).toHaveCount(0)
  const { rows: receipts } = await pool.query(
    "select amount,cash_effect,payment_fee from financial_events where type='cash_receipt'",
  )
  expect(receipts).toEqual([
    { amount: '20.00', cash_effect: '19.51', payment_fee: '0.49' },
  ])
  await page.goto('/financeiro', { waitUntil: 'networkidle' })
  await expect(
    page.getByText('Lucro registrado', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Lucro e meta conjunta' }),
  ).toContainText('18,99')
  await page.goto('/relatorios', { waitUntil: 'networkidle' })
  const reportPayload = await rpc(page, 'getOperationalReports')
  expect(reportPayload.ok, reportPayload.message).toBe(true)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar CSV', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.csv$/)
  const stream = await download.createReadStream()
  let csv = ''
  for await (const part of stream) csv += part.toString('utf8')
  expect(csv).toContain('Brownie sintético')
  expect(csv).toContain('20.00')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  const final = await counters()
  expect(final.purchases).toBe(1)
  expect(final.batches).toBe(1)
  expect(final.sales).toBe(1)
  expect(final.audit).toBeGreaterThanOrEqual(6)
})

test('report payload and CSV render against PostgreSQL', async ({ page }) => {
  await identity(page, 'owner')
  const payload = await rpc(page, 'getOperationalReports')
  expect(payload.ok, payload.message).toBe(true)
  await page.goto('/relatorios', { waitUntil: 'networkidle' })
  await expect(
    page.getByRole('button', { name: 'Baixar CSV', exact: true }),
  ).toBeVisible()
})

function businessToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

test('employee, production and manager persist only their allowed operations with the actual actor', async ({
  page,
}) => {
  const today = businessToday()
  await identity(page, 'employee')
  const purchase = await rpc(page, 'createPurchase', {
    idempotencyKey: crypto.randomUUID(),
    supplierName: 'QA employee',
    purchasedAt: today,
    items: [
      { productId: 1, quantity: '1', purchaseUnit: 'kg', totalAmount: '12.50' },
    ],
  })
  expect(purchase.ok, purchase.message).toBe(true)
  const sale = await rpc(page, 'createSale', {
    idempotencyKey: crypto.randomUUID(),
    locationId: 1,
    status: 'confirmed',
    reportedAmount: '10.00',
    adjustmentKind: 'none',
    items: [{ productId: 2, quantity: '1.000' }],
  })
  expect(sale.ok, sale.message).toBe(true)
  await identity(page, 'production')
  const draft = await rpc(page, 'createProductionBatch', {
    recipeVersionId: 1,
    productionDate: today,
    recipeMultiplier: '1',
    outputs: [{ productId: 2, quantity: '12' }],
    losses: [],
  })
  expect(draft.ok, draft.message).toBe(true)
  const complete = await rpc(page, 'completeProductionBatch', {
    id: draft.value.id,
  })
  expect(complete.ok, complete.message).toBe(true)
  await identity(page, 'manager')
  const expense = await rpc(page, 'createExpense', {
    idempotencyKey: crypto.randomUUID(),
    description: 'QA variable expense',
    category: 'QA',
    classification: 'variable',
    amount: '1.00',
    occurredAt: today,
  })
  expect(expense.ok, expense.message).toBe(true)
  const actors = (
    await pool.query(
      'select distinct actor_auth_user_id from operational_audit_events order by actor_auth_user_id',
    )
  ).rows.map((row) => row.actor_auth_user_id)
  expect(actors).toEqual([
    'qa-employee',
    'qa-manager',
    'qa-owner',
    'qa-production',
  ])
})

test('access revocation takes effect on the next HTTP request without changing the cookie', async ({
  page,
}) => {
  await identity(page, 'manager')
  expect((await rpc(page, 'getDashboard')).ok).toBe(true)
  await pool.query(
    "update app_user_access set is_active=false where auth_user_id='qa-manager'",
  )
  try {
    const before = await counters()
    const denied = await rpc(page, 'getDashboard')
    expect(denied.ok).toBe(false)
    expect(denied.message).toMatch(/Autenticação/)
    expect(await counters()).toEqual(before)
  } finally {
    await pool.query(
      "update app_user_access set is_active=true where auth_user_id='qa-manager'",
    )
  }
})

test('cancel, return, credit, partial redemption, refund, closure and correction preserve the ledger', async ({
  page,
}) => {
  const today = businessToday()
  await identity(page, 'owner')
  const before = (
    await pool.query(
      'select sum(quantity_delta)::text balance from stock_movements where product_id=2',
    )
  ).rows[0].balance
  const cancelled = await rpc(page, 'cancelSaleLifecycle', {
    saleId: 2,
    occurredOn: today,
    reason: 'QA cancellation before delivery',
  })
  expect(cancelled.ok, cancelled.message).toBe(true)
  const after = (
    await pool.query(
      'select sum(quantity_delta)::text balance from stock_movements where product_id=2',
    )
  ).rows[0].balance
  expect(Number(after) - Number(before)).toBe(1)
  const cancellationCounts = await counters()
  await rpc(page, 'cancelSaleLifecycle', {
    saleId: 2,
    occurredOn: today,
    reason: 'QA cancellation before delivery',
  })
  expect(await counters()).toEqual(cancellationCounts)
  await identity(page, 'manager')
  const item = (await pool.query('select id from sale_items where sale_id=1'))
    .rows[0]
  const stockBeforeReturn = (await counters()).movements
  const credit = await rpc(page, 'returnSaleLifecycle', {
    saleItemId: item.id,
    quantity: '1',
    settlement: 'store_credit',
    occurredOn: today,
    reason: 'QA return after delivery',
    reference: crypto.randomUUID(),
  })
  expect(credit.ok, credit.message).toBe(true)
  expect((await counters()).movements).toBe(stockBeforeReturn)
  const issuance = (
    await pool.query(
      "select id from financial_events where type='store_credit_issued'",
    )
  ).rows[0]
  const redemption = {
    issuanceEventId: issuance.id,
    amount: '4.00',
    occurredOn: today,
    reason: 'QA partial redemption',
    reference: crypto.randomUUID(),
  }
  const redeemed = await rpc(page, 'redeemStoreCredit', redemption)
  expect(redeemed.ok, redeemed.message).toBe(true)
  expect(redeemed.value.remaining).toBe('6.00')
  const afterRedemption = await counters()
  expect((await rpc(page, 'redeemStoreCredit', redemption)).ok).toBe(true)
  expect(await counters()).toEqual(afterRedemption)
  const refund = await rpc(page, 'returnSaleLifecycle', {
    saleItemId: item.id,
    quantity: '1',
    settlement: 'refund',
    occurredOn: today,
    reason: 'QA remaining return refund',
    reference: crypto.randomUUID(),
  })
  expect(refund.ok, refund.message).toBe(true)
  expect((await counters()).movements).toBe(stockBeforeReturn)
  expect(
    (
      await pool.query(
        "select cash_effect,revenue_effect from financial_events where type='store_credit_redeemed'",
      )
    ).rows,
  ).toEqual([{ cash_effect: '0.00', revenue_effect: '0.00' }])
  expect(
    (
      await pool.query(
        "select payment_fee from financial_events where type='cash_receipt'",
      )
    ).rows,
  ).toEqual([{ payment_fee: '0.49' }])
  await identity(page, 'owner')
  const closed = await rpc(page, 'closeFinancialPeriod', {
    periodMonth: `${today.slice(0, 7)}-01`,
    notes: 'QA close period',
  })
  expect(closed.ok, closed.message).toBe(true)
  await identity(page, 'manager')
  const beforeRejected = await counters()
  const rejected = await rpc(page, 'createExpense', {
    idempotencyKey: crypto.randomUUID(),
    description: 'QA closed period',
    category: 'QA',
    classification: 'variable',
    amount: '1.00',
    occurredAt: today,
  })
  expect(rejected.ok).toBe(false)
  expect(rejected.message).toMatch(/fechado/)
  expect(await counters()).toEqual(beforeRejected)
  await identity(page, 'owner')
  const original = (
    await pool.query(
      "select id from financial_events where type='cash_receipt'",
    )
  ).rows[0]
  const corrected = await rpc(page, 'correctFinancialEvent', {
    correctsEventId: original.id,
    effect: 'cash',
    deltaAmount: '0.01',
    occurredOn: today,
    reason: 'QA compensating correction',
    reference: crypto.randomUUID(),
  })
  expect(corrected.ok, corrected.message).toBe(true)
})
