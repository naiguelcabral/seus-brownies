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

test('inventory actions reflect each role before a user can fill a forbidden form', async ({
  page,
}, testInfo) => {
  for (const [role, label, canAdjust, canCompensate] of [
    ['manager', 'Gerente', false, true],
    ['production', 'Produção', false, false],
    ['owner', 'Dono', true, true],
  ]) {
    await identity(page, role)
    const before = await counters()
    await page.goto('/estoque')
    await expect(page.getByTestId('fifo-lifecycle-client-ready')).toBeVisible()
    await expect(
      page.getByText(`Perfil atual: ${label}`, { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Conferir lote de ajustes positivos',
        exact: true,
      }),
    ).toHaveCount(canAdjust ? 1 : 0)
    if (role === 'owner') {
      await page.setViewportSize({ width: 375, height: 812 })
      await page
        .getByRole('region', { name: 'Ciclo de vida e ajustes', exact: true })
        .screenshot({
          path: testInfo.outputPath('inventory-lifecycle-actions-mobile.png'),
        })
    }
    for (const [index, [title, submit, permitted]] of [
      ['Compensação pós-entrega', 'Registrar compensação', canCompensate],
      ['Perda de estoque', 'Registrar perda de estoque', canAdjust],
      ['Ajuste positivo', 'Registrar ajuste positivo', canAdjust],
      ['Ajuste negativo', 'Registrar ajuste negativo', canAdjust],
    ].entries()) {
      const launcher = page.getByRole('button', { name: title, exact: true })
      await expect(launcher).toHaveCount(permitted ? 1 : 0)
      await expect(
        page.getByRole('button', { name: submit, exact: true }),
      ).toHaveCount(0)
      if (!permitted) continue
      await launcher.click()
      const dialog = page.getByRole('dialog', { name: title, exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('form')).toHaveCount(1)
      await expect(
        dialog.getByRole('button', { name: submit, exact: true }),
      ).toBeVisible()
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true)
      const quantity = dialog.getByRole('textbox', {
        name: 'Quantidade',
        exact: true,
      })
      await quantity.fill(String(index + 1))
      if (title === 'Compensação pós-entrega') {
        await dialog.getByRole('button', { name: submit, exact: true }).click()
        await expect(dialog.getByRole('alert')).toBeFocused()
        await expect(dialog.getByRole('alert')).toBeInViewport()
        await expect(quantity).toHaveValue(String(index + 1))
      }
      if (title !== 'Compensação pós-entrega') {
        await expect(
          dialog.getByRole('button', { name: submit, exact: true }),
        ).toBeDisabled()
        await dialog.getByRole('checkbox').check()
      }
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(launcher).toBeFocused()
      await launcher.click()
      await expect(quantity).toHaveValue(String(index + 1))
      if (title !== 'Compensação pós-entrega')
        await expect(dialog.getByRole('checkbox')).not.toBeChecked()
      if (role === 'owner')
        await page.screenshot({
          path: testInfo.outputPath(`inventory-lifecycle-${index}-mobile.png`),
        })
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(launcher).toBeFocused()
      expect(await counters()).toEqual(before)
    }
    if (!canAdjust)
      await expect(
        page.getByText(
          'Ajustes e perdas de estoque exigem perfil Dono ou Administrador.',
          { exact: true },
        ),
      ).toBeVisible()
    expect(await counters()).toEqual(before)
  }
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
      {
        name: 'cacau-connected-qa-issued-at',
        value: new Date().toISOString(),
        url: origin,
        httpOnly: true,
        sameSite: 'Strict',
      },
    ])
  // Vite's development connection can stay active after the document is ready.
  // Each test waits for its actual UI or RPC result instead of network silence.
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
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
      'findRegistrationCandidate',
      'approveRegistration',
      'checkPositiveAdjustmentBatch',
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
    'access:approve',
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
    expect(Object.keys(policies)).toHaveLength(58)
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
    const menuLinks = page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link')
    if (role === 'employee') {
      await expect(menuLinks).toHaveText([
        'Vendas',
        'Produtos',
        'Compras',
        'Categorias',
      ])
    } else if (role === 'owner' || role === 'manager') {
      await expect(menuLinks.nth(0)).toHaveText('Visão geral')
      await expect(menuLinks.nth(1)).toHaveText('Relatórios')
      await expect(menuLinks.nth(2)).toHaveText('Estoque')
    } else if (role === 'production') {
      await expect(menuLinks).toHaveText([
        'Estoque',
        'Produção',
        'Categorias',
        'Produtos',
      ])
    }
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

const scenarioDraft = {
  name: 'Cenário QA isolado',
  description: 'Premissas sintéticas',
  effectiveOn: '2026-10-01',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2288.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.7000',
  feeTaxReserveRate: '0.0000',
  mix: [
    {
      productId: 2,
      originalWeight: '0.33',
      plannedUnitPrice: '10.00',
      plannedUnitCost: '2.517',
    },
    {
      productId: 3,
      originalWeight: '0.70',
      plannedUnitPrice: '6.00',
      plannedUnitCost: '0.923',
    },
  ],
}
async function scenarioState() {
  return (
    await pool.query(`select
    (select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]') from management_scenarios s) scenarios,
    (select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from management_scenario_mix m) mix,
    (select coalesce(jsonb_agg(to_jsonb(h) order by id),'[]') from management_scenario_history h) history,
    (select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from operational_audit_events a) audit`)
  ).rows[0]
}

test('scenario HTTP lifecycle preserves exact mix, versions, revisions, activation and actors in PostgreSQL', async ({
  page,
}) => {
  await identity(page, 'owner')
  const created = await rpc(page, 'createScenario', scenarioDraft)
  expect(created.ok, created.message).toBe(true)
  expect(created.value).toMatchObject({ version: 1, revision: 1 })
  const id = created.value.id
  let listed = await rpc(page, 'listScenarios', { page: 1 })
  expect(listed.ok, listed.message).toBe(true)
  let stored = listed.value.scenarios.find((row) => row.id === id)
  expect(stored.status).toBe('draft')
  expect(stored.projectionStatus).toBe('available')
  expect(stored.projection.marginNeededBeforeFixedCosts).toBe('12288.00')
  expect(
    stored.mix.map((row) => [row.originalWeight, row.normalizedWeightBps]),
  ).toEqual([
    ['0.330000', 3204],
    ['0.700000', 6796],
  ])
  expect(stored.mix[0].plannedUnitCost).toBe('2.517')
  const projection = stored.projection
  const update = await rpc(page, 'updateScenarioDraft', {
    ...scenarioDraft,
    id,
    expectedRevision: 1,
    name: 'Cenário QA revisado',
  })
  expect(update.value).toEqual({ id, version: 1, revision: 2 })
  let before = await scenarioState()
  expect(
    (
      await rpc(page, 'updateScenarioDraft', {
        ...scenarioDraft,
        id,
        expectedRevision: 1,
      })
    ).ok,
  ).toBe(false)
  expect(
    (
      await rpc(page, 'createScenarioVersion', {
        sourceScenarioId: id,
        reason: 'Rascunho ainda aberto',
      })
    ).ok,
  ).toBe(false)
  expect(await scenarioState()).toEqual(before)
  expect(
    (await rpc(page, 'activateScenario', { id, expectedRevision: 2 })).value,
  ).toEqual({ id, version: 1, revision: 3 })
  const original = (await scenarioState()).scenarios.find(
    (row) => row.id === id,
  )
  before = await scenarioState()
  expect(
    (
      await rpc(page, 'updateScenarioDraft', {
        ...scenarioDraft,
        id,
        expectedRevision: 3,
      })
    ).ok,
  ).toBe(false)
  expect(await scenarioState()).toEqual(before)
  const next = await rpc(page, 'createScenarioVersion', {
    sourceScenarioId: id,
    reason: 'Revisão das premissas QA',
  })
  expect(next.ok, next.message).toBe(true)
  expect(next.value).toMatchObject({ version: 2, revision: 1 })
  const nextId = next.value.id
  expect(
    (await scenarioState()).scenarios.find((row) => row.id === id),
  ).toEqual(original)
  before = await scenarioState()
  expect(
    (await rpc(page, 'activateScenario', { id: nextId, expectedRevision: 1 }))
      .ok,
  ).toBe(false)
  expect(await scenarioState()).toEqual(before)
  expect(
    (
      await rpc(page, 'activateScenario', {
        id: nextId,
        expectedRevision: 1,
        reason: 'Substituição QA',
      })
    ).value,
  ).toEqual({ id: nextId, version: 2, revision: 2 })
  listed = await rpc(page, 'listScenarios', { page: 1 })
  expect(listed.value.activeScenario.id).toBe(nextId)
  expect(listed.value.activeScenario.projection).toEqual(projection)
  stored = listed.value.scenarios.find((row) => row.id === id)
  expect(stored).toMatchObject({
    status: 'archived',
    revision: 4,
    archiveReason: 'Substituição QA',
  })
  expect(
    (
      await rpc(page, 'archiveScenario', {
        id: nextId,
        expectedRevision: 2,
        reason: 'Encerramento QA',
      })
    ).value,
  ).toEqual({ id: nextId, version: 2, revision: 3 })
  before = await scenarioState()
  expect(
    (
      await rpc(page, 'archiveScenario', {
        id: nextId,
        expectedRevision: 3,
        reason: 'Repetição QA',
      })
    ).ok,
  ).toBe(false)
  expect(await scenarioState()).toEqual(before)
  expect(before.history.map((row) => row.event)).toEqual([
    'created',
    'updated',
    'activated',
    'version_created',
    'replaced',
    'activated',
    'archived',
  ])
  expect(
    before.history.every((row) => row.actor_auth_user_id === 'qa-owner'),
  ).toBe(true)
  expect(
    before.history
      .find((row) => row.event === 'version_created')
      .snapshot.mix.map((row) => row.normalizedWeightBps),
  ).toEqual([3204, 6796])
  expect(
    before.audit.filter((row) => row.entity_type === 'management_scenario'),
  ).toHaveLength(7)
})

test('all five scenario writers roll back scenario, mix, history and audit when either audit sink fails', async ({
  page,
}) => {
  await identity(page, 'owner')
  const active = await rpc(page, 'createScenario', scenarioDraft)
  expect(active.ok, active.message).toBe(true)
  const activeId = active.value.id
  expect(
    (await rpc(page, 'activateScenario', { id: activeId, expectedRevision: 1 }))
      .ok,
  ).toBe(true)
  const candidate = await rpc(page, 'createScenario', scenarioDraft)
  expect(candidate.ok, candidate.message).toBe(true)
  const candidateId = candidate.value.id
  await pool.query(`create function qa_reject_scenario_audit() returns trigger language plpgsql as $$
    begin raise exception 'Synthetic scenario audit sink unavailable'; end $$`)
  for (const table of [
    'management_scenario_history',
    'operational_audit_events',
  ]) {
    await pool.query(`create trigger qa_scenario_audit_failure before insert on ${table}
      for each row execute function qa_reject_scenario_audit()`)
    try {
      for (const [name, input] of [
        ['createScenario', scenarioDraft],
        [
          'updateScenarioDraft',
          {
            ...scenarioDraft,
            id: candidateId,
            expectedRevision: 1,
            mix: [scenarioDraft.mix[0]],
          },
        ],
        [
          'createScenarioVersion',
          { sourceScenarioId: activeId, reason: 'Versão QA' },
        ],
        [
          'activateScenario',
          { id: candidateId, expectedRevision: 1, reason: 'Substituição QA' },
        ],
        [
          'archiveScenario',
          { id: activeId, expectedRevision: 2, reason: 'Arquivo QA' },
        ],
      ]) {
        const before = await scenarioState()
        const result = await rpc(page, name, input)
        expect(result.ok, `${table}: ${name}`).toBe(false)
        expect(
          await scenarioState(),
          `${table}: ${name} must roll back`,
        ).toEqual(before)
      }
    } finally {
      await pool.query(
        `alter table ${table} disable trigger qa_scenario_audit_failure`,
      )
    }
  }
})

test('manager approves a verified registration through the real UI and requires a new target session', async ({
  page,
  browser,
}) => {
  const targetContext = await browser.newContext()
  await targetContext.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort('blockedbyclient'),
  )
  await targetContext.routeWebSocket('**/*', (socket) => socket.close())
  const target = await targetContext.newPage()
  try {
    await identity(target, 'approved-employee')
    expect((await rpc(target, 'listPurchasableProducts')).ok).toBe(false)
    await identity(page, 'manager')
    await page.setViewportSize({ width: 320, height: 740 })
    await page.goto('/acessos', { waitUntil: 'networkidle' })
    await expect(
      page.getByRole('heading', { name: 'Aprovar cadastros', exact: true }),
    ).toBeVisible()
    await page.getByLabel('E-mail do cadastro').fill('approved@example.test')
    await page
      .getByRole('button', { name: 'Verificar cadastro', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Cadastro QA isolado' }),
    ).toBeVisible()
    await page
      .getByLabel('Motivo da liberação')
      .fill('Cadastro conferido no laboratório conectado')
    await page
      .getByRole('button', { name: 'Aprovar como Funcionário', exact: true })
      .click()
    await expect(page.getByRole('status')).toContainText(
      'Acesso de Funcionário aprovado.',
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    const access = (
      await pool.query(
        'SELECT id,role,is_active FROM app_user_access WHERE auth_user_id=$1',
        ['b1f5fcd8-7d94-4c51-9856-128930a030e5'],
      )
    ).rows[0]
    expect(access.role).toBe('employee')
    expect(access.is_active).toBe(true)
    const audits = (
      await pool.query(
        "SELECT actor_auth_user_id,metadata FROM auth_audit_events WHERE action='role_changed' AND target_type='access' AND target_id=$1",
        [String(access.id)],
      )
    ).rows
    expect(audits).toHaveLength(1)
    expect(audits[0].actor_auth_user_id).toBe('qa-manager')
    expect(audits[0].metadata.after).toEqual({
      role: 'employee',
      isActive: true,
    })
    // Existing provider cookie must not gain access merely because its link appeared.
    expect((await rpc(target, 'listPurchasableProducts')).ok).toBe(false)
    await identity(target, 'approved-employee')
    expect((await rpc(target, 'listPurchasableProducts')).ok).toBe(true)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByLabel('E-mail do cadastro').fill('approved@example.test')
    await page
      .getByRole('button', { name: 'Verificar cadastro', exact: true })
      .click()
    await expect(page.getByRole('status')).toContainText('já possui um vínculo')
    expect(
      (
        await pool.query(
          "SELECT count(*)::int count FROM auth_audit_events WHERE action='role_changed' AND target_id=$1",
          [String(access.id)],
        )
      ).rows[0].count,
    ).toBe(1)
  } finally {
    await targetContext.close()
  }
})

test('tablet batch uses guarded HTTP writes, persists exact totals and reopens without duplicates', async ({
  page,
}) => {
  await identity(page, 'manager')
  const category = await rpc(page, 'createCategory', { name: 'QA Batch only' })
  expect(category.ok).toBe(true)
  const manifest = {
    version: 1,
    targetOrigin: origin,
    products: [
      {
        kind: 'new',
        key: 'oil',
        name: 'QA Batch oil',
        sku: 'QA-BATCH-OIL',
        type: 'ingredient',
        unit: 'ml',
        categoryId: category.value.id,
        categoryName: 'QA Batch only',
        description: 'Disposable connected fixture only',
      },
    ],
    purchases: [
      {
        idempotencyKey: 'e90ec225-5ca6-4413-b0a4-194d6fe6f562',
        supplierName: 'QA Batch supplier',
        purchasedAt: '2026-09-02',
        invoiceFileReference: 'QA-BATCH-ONLY-A',
        notes: 'Local fixture only',
        items: [{ productKey: 'oil', quantity: '900', totalAmount: '6.99' }],
      },
      {
        idempotencyKey: 'c83c84de-3719-42e2-9586-2a81cce3a7b3',
        supplierName: 'QA Batch supplier',
        purchasedAt: '2026-09-03',
        invoiceFileReference: 'QA-BATCH-ONLY-B',
        notes: 'Local fixture only',
        items: [{ productKey: 'oil', quantity: '1800', totalAmount: '13.98' }],
      },
    ],
  }
  const url =
    '/compras#lote=' +
    Buffer.from(JSON.stringify(manifest)).toString('base64url')
  const before = await counters()
  await page.setViewportSize({ width: 768, height: 1024 })
  const preview = async () => {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page
      .getByRole('button', { name: 'Importar lote de compras', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Importar lote de compras',
      exact: true,
    })
    await dialog
      .getByRole('button', { name: 'Conferir lote', exact: true })
      .click()
    await expect(
      dialog.getByRole('region', { name: 'Conferência do lote' }),
    ).toContainText('2 compras · Total: R$ 20,97')
    return dialog
  }
  let dialog = await preview()
  expect(await counters()).toEqual(before)
  await dialog
    .getByRole('button', { name: 'Confirmar e incluir compras', exact: true })
    .click()
  await expect(dialog.getByRole('status')).toContainText('Lote concluído')
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
  const after = await counters()
  expect(after.purchases - before.purchases).toBe(2)
  expect(after.movements - before.movements).toBe(2)
  expect(after.audit - before.audit).toBe(3)
  expect(after.events).toBe(before.events)
  const purchases = (
    await pool.query(
      'SELECT purchased_at::text AS purchase_date,total_amount::text AS total,created_by_auth_user_id AS actor FROM purchases WHERE idempotency_key=ANY($1::text[]) ORDER BY purchased_at',
      [manifest.purchases.map((purchase) => purchase.idempotencyKey)],
    )
  ).rows
  expect(purchases).toEqual([
    { purchase_date: '2026-09-02', total: '6.99', actor: 'qa-manager' },
    { purchase_date: '2026-09-03', total: '13.98', actor: 'qa-manager' },
  ])
  const stock = (
    await pool.query(
      "SELECT sum(m.quantity_delta)::text quantity,sum(m.allocated_cost)::text cost FROM stock_movements m JOIN products p ON p.id=m.product_id WHERE p.sku='QA-BATCH-OIL'",
    )
  ).rows[0]
  expect(stock).toEqual({ quantity: '2700.000', cost: '20.97' })
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  dialog = await preview()
  await dialog
    .getByRole('button', { name: 'Confirmar e incluir compras', exact: true })
    .click()
  await expect(dialog.getByRole('status')).toContainText('Lote concluído')
  await expect(dialog.getByLabel('Resultado da inclusão')).toContainText(
    'já registrada; sem duplicação',
  )
  expect(await counters()).toEqual(after)
})

test('owner sees a focused stock result and duplicate adjustment error without extra writes', async ({
  page,
}, testInfo) => {
  await pool.query(
    "insert into products(sku,name,product_type,measurement_unit) values ('QA-FEEDBACK','Insumo de retorno sintético','ingredient','g')",
  )
  await identity(page, 'owner')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/estoque')
  await expect(page.getByTestId('fifo-lifecycle-client-ready')).toBeVisible()
  await page
    .getByRole('button', { name: 'Ajuste positivo', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Ajuste positivo',
    exact: true,
  })
  const form = page.locator('form').filter({ hasText: 'Ajuste positivo' })
  await form
    .getByRole('combobox', { name: 'Produto', exact: true })
    .selectOption({ label: 'Insumo de retorno sintético · QA-FEEDBACK' })
  await form
    .getByRole('textbox', { name: 'Quantidade', exact: true })
    .fill('1,250')
  await form
    .getByRole('textbox', { name: 'Custo total', exact: true })
    .fill('1,11')
  await form
    .getByRole('textbox', { name: 'Origem do custo', exact: true })
    .fill('Fonte sintética descartável')
  await form
    .getByRole('textbox', { name: 'Motivo', exact: true })
    .fill('Ajuste de teste local descartável')
  await form
    .getByRole('textbox', { name: 'Referência', exact: true })
    .fill('QA-FEEDBACK-001')
  await form.getByRole('checkbox').check()
  const before = await counters()
  let releasePost = () => {}
  const gate = new Promise((resolve) => {
    releasePost = resolve
  })
  let blockedPosts = 0
  const holdPost = async (route) => {
    if (new URL(route.request().url()).origin !== origin)
      return route.abort('blockedbyclient')
    if (route.request().method() === 'POST') {
      blockedPosts++
      await gate
    }
    await route.continue()
  }
  await page.route('**/*', holdPost)
  try {
    await form
      .getByRole('button', { name: 'Registrar ajuste positivo', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Fechar', exact: true }),
    ).toBeDisabled()
    await expect(
      form.getByRole('textbox', { name: 'Quantidade', exact: true }),
    ).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await form.evaluate((element) => element.requestSubmit())
    await expect.poll(() => blockedPosts).toBe(1)
    expect(await counters()).toEqual(before)
  } finally {
    releasePost()
  }
  const success = page
    .getByRole('status')
    .filter({ hasText: 'Evento FIFO registrado.' })
  await expect(success).toBeFocused()
  await expect(
    page.getByRole('navigation', { name: 'Paginação do razão de estoque' }),
  ).toContainText(`${before.movements + 1} movimentações`)
  await expect(success).toBeInViewport()
  const after = await counters()
  expect(after).toEqual({
    ...before,
    movements: before.movements + 1,
    audit: before.audit + 1,
  })
  await form
    .getByRole('button', { name: 'Registrar ajuste positivo', exact: true })
    .click()
  const error = page.getByRole('alert')
  await expect(error).toBeFocused()
  await expect(error).toBeInViewport()
  await expect(error).not.toBeEmpty()
  expect(await counters()).toEqual(after)
  await page.screenshot({
    path: testInfo.outputPath('inventory-feedback-mobile.png'),
  })
})

test('owner reviews four adjustments on tablet, confirms audited FIFO once and safely reopens the same manifest', async ({
  page,
}, testInfo) => {
  const products = (
    await pool.query(
      "insert into products(sku,name,product_type,measurement_unit) values ('QA-ADJ-G','Farinha sintética em lote','ingredient','g'),('QA-ADJ-M','Papel sintético em lote','ingredient','m'),('QA-ADJ-U1','Adesivo sintético em lote','ingredient','unit'),('QA-ADJ-U2','Embalagem sintética em lote','ingredient','unit') returning id,sku,name,measurement_unit as unit",
    )
  ).rows
  const manifest = {
    version: 1,
    targetOrigin: origin,
    adjustments: products.map((product, index) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity: ['240', '0.8', '24', '24'][index],
      totalCost: ['1.20', '0.40', '3.84', '3.60'][index],
      reference: `QA-ADJUSTMENT-BATCH-${index}`,
      reason: 'Fixture descartável; sem contagem física',
      originReference: `Fonte sintética:${index}`,
    })),
  }
  await identity(page, 'owner')
  const before = await counters()
  const wrongOrigin = await rpc(page, 'checkPositiveAdjustmentBatch', {
    ...manifest,
    targetOrigin: 'https://other.example.invalid',
  })
  expect(wrongOrigin.ok).toBe(false)
  expect(wrongOrigin.message).toContain('outro ambiente')
  await page.setViewportSize({ width: 375, height: 812 })
  async function preview() {
    await page.goto(
      '/estoque#ajustes=' +
        Buffer.from(JSON.stringify(manifest)).toString('base64url'),
    )
    await expect(page.getByTestId('fifo-lifecycle-client-ready')).toBeVisible()
    await page
      .getByRole('button', {
        name: 'Conferir lote de ajustes positivos',
        exact: true,
      })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Conferir ajustes positivos',
    })
    await expect(dialog.getByLabel('Dados dos ajustes')).toHaveValue(
      JSON.stringify(manifest),
    )
    expect(new URL(page.url()).hash).toBe('')
    await dialog
      .getByRole('button', { name: 'Conferir ajustes', exact: true })
      .click()
    await expect(dialog.getByLabel('Conferência dos ajustes')).toContainText(
      '4 ajustes · Total: R$ 9,04',
    )
    await expect(
      dialog.getByRole('button', {
        name: 'Confirmar e incluir ajustes',
        exact: true,
      }),
    ).toBeDisabled()
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    return dialog
  }
  let dialog = await preview()
  expect(await counters()).toEqual(before)
  await page.screenshot({
    path: testInfo.outputPath('adjustment-batch-preview-mobile.png'),
  })
  await dialog.getByRole('checkbox').check()
  await dialog
    .getByRole('button', { name: 'Confirmar e incluir ajustes', exact: true })
    .click()
  await expect(dialog.getByRole('status')).toContainText('Ajustes concluídos')
  await expect(dialog.getByLabel('Conferência dos ajustes')).not.toContainText(
    'Ajuste pendente.',
  )
  const after = await counters()
  expect(after).toEqual({
    ...before,
    movements: before.movements + 4,
    audit: before.audit + 4,
  })
  const rows = (
    await pool.query(
      "select m.quantity_delta::text quantity,m.allocated_cost::text cost,m.exact_cost,l.original_quantity::text layer_quantity,l.original_cost::text layer_cost,a.actor_auth_user_id actor from stock_movements m join inventory_cost_layers l on l.source_stock_movement_id=m.id join operational_audit_events a on a.entity_type='stock_movement' and a.entity_id=m.id::text and a.action='inventory.adjustment_positive' where m.product_id=any($1::int[]) order by m.id",
      [products.map((product) => product.id)],
    )
  ).rows
  expect(rows).toEqual([
    {
      quantity: '240.000',
      cost: '1.20',
      exact_cost: { numerator: '6', denominator: '5' },
      layer_quantity: '240.000',
      layer_cost: '1.20',
      actor: 'qa-owner',
    },
    {
      quantity: '0.800',
      cost: '0.40',
      exact_cost: { numerator: '2', denominator: '5' },
      layer_quantity: '0.800',
      layer_cost: '0.40',
      actor: 'qa-owner',
    },
    {
      quantity: '24.000',
      cost: '3.84',
      exact_cost: { numerator: '96', denominator: '25' },
      layer_quantity: '24.000',
      layer_cost: '3.84',
      actor: 'qa-owner',
    },
    {
      quantity: '24.000',
      cost: '3.60',
      exact_cost: { numerator: '18', denominator: '5' },
      layer_quantity: '24.000',
      layer_cost: '3.60',
      actor: 'qa-owner',
    },
  ])
  await page.screenshot({
    path: testInfo.outputPath('adjustment-batch-complete-mobile.png'),
  })
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click()
  dialog = await preview()
  await expect(dialog.getByLabel('Conferência dos ajustes')).toContainText(
    'Já registrado',
  )
  await dialog.getByRole('checkbox').check()
  await dialog
    .getByRole('button', { name: 'Confirmar e incluir ajustes', exact: true })
    .click()
  await expect(dialog.getByRole('status')).toContainText('Ajustes concluídos')
  await expect(
    dialog.getByLabel('Resultado dos ajustes').getByRole('listitem'),
  ).toHaveCount(4)
  await expect(dialog.getByLabel('Resultado dos ajustes')).toContainText(
    'já registrado; sem duplicação',
  )
  expect(await counters()).toEqual(after)
  const conflict = structuredClone(manifest)
  conflict.adjustments[0].quantity = '241'
  const result = await rpc(page, 'checkPositiveAdjustmentBatch', conflict)
  expect(result.ok).toBe(false)
  expect(result.message).toContain('dados diferentes')
  expect(await counters()).toEqual(after)
})

test('an input consumed by production cannot be lost or adjusted out again through a remaining receipt layer', async ({
  page,
}) => {
  // Disposable fixture only: isolate the input and recipe from all earlier cases.
  const input = (
    await pool.query(
      "insert into products(sku,name,product_type,measurement_unit) values ('QA-CONSUMED-INPUT','Entrada sintética consumida','ingredient','g') returning id",
    )
  ).rows[0]
  const output = (
    await pool.query(
      "insert into products(sku,name,product_type,measurement_unit,sale_price) values ('QA-CONSUMED-OUTPUT','Saída sintética isolada','finished_product','unit','2.00') returning id",
    )
  ).rows[0]
  const recipe = (
    await pool.query(
      "insert into recipe_versions(source_id,source_hash,name,version,status,source_payload) values ('QA-CONSUMED-RECIPE','QA-CONSUMED-RECIPE-HASH','Receita isolada de consumo',1,'active','{}') returning id",
    )
  ).rows[0]
  await pool.query(
    "insert into recipe_items(source_key,source_hash,recipe_version_id,product_id,source_name,quantity,unit,source_payload) values ('QA-CONSUMED-ITEM','QA-CONSUMED-ITEM-HASH',$1,$2,'Entrada sintética consumida','1','g','{}')",
    [recipe.id, input.id],
  )
  await pool.query(
    "insert into production_profiles(source_id,source_hash,recipe_version_id,product_id,expected_yield,source_payload) values ('QA-CONSUMED-PROFILE','QA-CONSUMED-PROFILE-HASH',$1,$2,'1','{}'),('QA-CONSUMED-EDGE','QA-CONSUMED-EDGE-HASH',$1,3,'1','{}')",
    [recipe.id, output.id],
  )
  await pool.query(
    "insert into recipe_operational_requirements(source_key,source_hash,recipe_version_id,type,quantity,unit,source_payload) values ('QA-CONSUMED-ENERGY','QA-CONSUMED-ENERGY-HASH',$1,'energy','1','kwh','{}'),('QA-CONSUMED-LABOR','QA-CONSUMED-LABOR-HASH',$1,'labor','1','hour','{}')",
    [recipe.id],
  )
  await identity(page, 'owner')
  const incoming = await rpc(page, 'recordPositiveAdjustmentLifecycle', {
    productId: input.id,
    quantity: '1',
    totalCost: '1.00',
    reason: 'Entrada sintética descartável',
    reference: 'QA-CONSUMED-IN',
    originReference: 'Fixture local',
  })
  expect(incoming.ok, incoming.message).toBe(true)
  const draft = await rpc(page, 'createProductionBatch', {
    recipeVersionId: recipe.id,
    productionDate: '2026-10-30',
    recipeMultiplier: '1',
    outputs: [{ productId: output.id, quantity: '1' }],
    bordinhasQuantity: '0',
    losses: [],
    notes: 'Fixture de integridade local',
  })
  expect(draft.ok, draft.message).toBe(true)
  const completion = await rpc(page, 'completeProductionBatch', {
    id: draft.value.id,
  })
  expect(completion.ok, completion.message).toBe(true)
  const balance = async () =>
    (
      await pool.query(
        'select sum(quantity_delta)::text quantity from stock_movements where product_id=$1',
        [input.id],
      )
    ).rows[0].quantity
  expect(await balance()).toBe('0.000')
  const before = await counters()
  for (const [index, name] of [
    'recordLossLifecycle',
    'recordNegativeAdjustmentLifecycle',
  ].entries()) {
    const result = await rpc(page, name, {
      productId: input.id,
      quantity: '1',
      reason: 'Não consumir de novo',
      reference: `QA-CONSUMED-OUT-${index}`,
    })
    expect(result.ok, `${name}: must respect the actual stock ledger`).toBe(
      false,
    )
    expect(result.message).toMatch(/Estoque insuficiente/)
    expect(await balance()).toBe('0.000')
    expect(await counters()).toEqual(before)
  }
})
