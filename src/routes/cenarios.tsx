import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { formatBrlMoney } from '#/lib/format-money'
import { compareProjectionWithRealized } from '#/features/scenarios/calculations'
import type {
  ScenarioProjection,
  ScenarioRealizedComparison,
} from '#/features/scenarios/calculations'
import {
  activateScenario,
  archiveScenario,
  createScenario,
  createScenarioVersion,
  listScenarios,
  updateScenarioDraft,
} from '#/features/scenarios/functions'
import { scenarioStatuses } from '#/features/scenarios/contracts'
import { getFinancialOverview } from '#/features/finance/functions'

const scenarioSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(scenarioStatuses).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/cenarios')({
  validateSearch: scenarioSearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    status: search.status,
    page: search.page,
  }),
  loader: async ({ deps }) => {
    const result = await listScenarios({ data: deps })
    const active = result.activeScenario
    if (!active?.projection)
      return {
        ...result,
        realized: active?.projection
          ? compareProjectionWithRealized(active.projection)
          : null,
      }
    try {
      const overview = await getFinancialOverview({
        data: { periodMonth: `${active.effectiveOn.slice(0, 7)}-01` },
      })
      return {
        ...result,
        realized: compareProjectionWithRealized(
          active.projection,
          overview.accrualMargins.reconciled
            ? overview.accrualMargins
            : undefined,
        ),
      }
    } catch {
      return {
        ...result,
        realized: compareProjectionWithRealized(active.projection),
      }
    }
  },
  component: ScenarioPage,
  pendingComponent: ScenarioPending,
  pendingMs: 300,
  errorComponent: ScenarioError,
})

type MixFormRow = {
  productId: number
  originalWeight: string
  plannedUnitPrice: string
  plannedUnitCost: string
}

type ActiveProductOption = {
  id: number
  name: string
  salePrice: string | null
}

type ScenarioForm = {
  name: string
  description: string
  effectiveOn: string
  monthlyProfitGoal: string
  fixedMonthlyCosts: string
  salesDaysPerMonth: string
  weeksPerMonth: string
  minimumMarginRate: string
  feeTaxReserveRate: string
  mix: MixFormRow[]
}

const emptyForm: ScenarioForm = {
  name: '',
  description: '',
  effectiveOn: '',
  monthlyProfitGoal: '',
  fixedMonthlyCosts: '',
  salesDaysPerMonth: '',
  weeksPerMonth: '',
  minimumMarginRate: '',
  feeTaxReserveRate: '',
  mix: [],
}

const statusLabels = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
} as const

function ScenarioPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const create = useServerFn(createScenario)
  const update = useServerFn(updateScenarioDraft)
  const activate = useServerFn(activateScenario)
  const archive = useServerFn(archiveScenario)
  const createVersion = useServerFn(createScenarioVersion)
  const [editing, setEditing] = useState<{
    id: number
    revision: number
  } | null>(null)
  const [form, setForm] = useState<ScenarioForm>(emptyForm)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function change<TField extends keyof ScenarioForm>(
    field: TField,
    value: ScenarioForm[TField],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function editMix(index: number, field: keyof MixFormRow, value: string) {
    setForm((current) => ({
      ...current,
      mix: current.mix.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }))
  }

  function addProduct() {
    const productId = Number(selectedProduct)
    const product = result.activeProducts.find((item) => item.id === productId)
    if (!product || form.mix.some((item) => item.productId === product.id))
      return
    setForm((current) => ({
      ...current,
      mix: [
        ...current.mix,
        {
          productId: product.id,
          originalWeight: '',
          plannedUnitPrice: product.salePrice ?? '',
          plannedUnitCost: '',
        },
      ],
    }))
    setSelectedProduct('')
  }

  async function runMutation(work: () => Promise<unknown>, success: string) {
    setSaving(true)
    setMessage(null)
    try {
      await work()
      setMessage(success)
      await router.invalidate({ sync: true })
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const salesDaysPerMonth = Number(form.salesDaysPerMonth)
    const data = {
      ...form,
      description: form.description || undefined,
      salesDaysPerMonth,
    }
    await runMutation(
      async () => {
        if (editing)
          await update({
            data: {
              ...data,
              id: editing.id,
              expectedRevision: editing.revision,
            },
          })
        else await create({ data })
        setEditing(null)
        setForm(emptyForm)
      },
      editing
        ? 'Rascunho atualizado com nova revisão auditada.'
        : 'Cenário criado como rascunho auditado.',
    )
  }

  function startEditing(item: (typeof result.scenarios)[number]) {
    setEditing({ id: item.id, revision: item.revision })
    setForm({
      name: item.name,
      description: item.description ?? '',
      effectiveOn: item.effectiveOn,
      monthlyProfitGoal: item.monthlyProfitGoal,
      fixedMonthlyCosts: item.fixedMonthlyCosts,
      salesDaysPerMonth: String(item.salesDaysPerMonth),
      weeksPerMonth: item.weeksPerMonth,
      minimumMarginRate: item.minimumMarginRate,
      feeTaxReserveRate: item.feeTaxReserveRate,
      mix: item.mix.map((row) => ({
        productId: row.productId,
        originalWeight: row.originalWeight,
        plannedUnitPrice: row.plannedUnitPrice,
        plannedUnitCost: row.plannedUnitCost,
      })),
    })
  }

  return (
    <ManagementLayout
      title="Metas e cenários"
      description="Premissas versionadas e projeções estimadas. Resultado realizado usa competência e CMV FIFO e nunca é substituído pela meta."
    >
      {message ? (
        <p
          className="mb-5 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <ActiveScenario
        scenario={result.activeScenario}
        realized={result.realized}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <form
            role="search"
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] p-5"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const status = String(data.get('status') ?? '')
              void navigate({
                search: {
                  query: String(data.get('query') ?? '').trim() || undefined,
                  status: (scenarioStatuses as readonly string[]).includes(
                    status,
                  )
                    ? (status as (typeof scenarioStatuses)[number])
                    : undefined,
                  page: 1,
                },
              })
            }}
          >
            <label className="text-xs font-bold text-[#573524]">
              Busca
              <input
                className="field mt-1"
                name="query"
                defaultValue={search.query}
                placeholder="Nome ou descrição"
              />
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Status
              <select
                className="field mt-1"
                name="status"
                defaultValue={search.status ?? ''}
              >
                <option value="">Todos</option>
                {scenarioStatuses.map((status) => (
                  <option value={status} key={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold">
              Filtrar
            </button>
          </form>

          {result.scenarios.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {result.scenarios.map((item) => (
                <li className="p-5" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {item.name} · versão {item.version}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#a64f23]">
                        {statusLabels[item.status]} · vigência{' '}
                        {item.effectiveOn}
                      </p>
                      <p className="mt-2 text-sm text-[#573524]">
                        Meta {formatBrlMoney(item.monthlyProfitGoal)} · custos
                        fixos {formatBrlMoney(item.fixedMonthlyCosts)} · mix{' '}
                        {item.projection?.mixWasNormalized
                          ? `normalizado de ${formatRate(item.projection.originalMixTotal)}`
                          : 'informado em 100%'}
                      </p>
                      <p className="mt-1 text-xs text-[#846859]">
                        {item.description || 'Sem descrição'} · revisão{' '}
                        {item.revision} · criado em {formatDate(item.createdAt)}
                      </p>
                      <p className="mt-2 text-xs text-[#846859]">
                        {item.projectionMessage}
                      </p>
                    </div>
                    {result.canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        {item.status === 'draft' ? (
                          <button
                            type="button"
                            className="text-xs font-bold text-[#a64f23]"
                            onClick={() => startEditing(item)}
                          >
                            Editar rascunho
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-bold text-[#a64f23]"
                            disabled={saving}
                            onClick={() =>
                              void runMutation(
                                () =>
                                  createVersion({
                                    data: {
                                      sourceScenarioId: item.id,
                                      reason: reasons[item.id] ?? '',
                                    },
                                  }),
                                'Nova versão criada como rascunho; a anterior permaneceu imutável.',
                              )
                            }
                          >
                            Criar nova versão
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {result.canWrite ? (
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="min-w-64 flex-1 text-xs font-bold text-[#573524]">
                        Motivo de ativação, substituição ou arquivamento
                        <input
                          className="field mt-1"
                          value={reasons[item.id] ?? ''}
                          onChange={(event) =>
                            setReasons((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      {item.status === 'draft' ? (
                        <button
                          type="button"
                          disabled={saving}
                          className="rounded-lg bg-[#4a2114] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                          onClick={() =>
                            void runMutation(
                              () =>
                                activate({
                                  data: {
                                    id: item.id,
                                    expectedRevision: item.revision,
                                    reason: reasons[item.id] || undefined,
                                  },
                                }),
                              'Cenário ativado com premissas e mix auditados.',
                            )
                          }
                        >
                          Ativar
                        </button>
                      ) : null}
                      {item.status !== 'archived' ? (
                        <button
                          type="button"
                          disabled={saving}
                          className="rounded-lg border border-[#75411f] px-3 py-2 text-xs font-bold disabled:opacity-60"
                          onClick={() =>
                            void runMutation(
                              () =>
                                archive({
                                  data: {
                                    id: item.id,
                                    expectedRevision: item.revision,
                                    reason: reasons[item.id] ?? '',
                                  },
                                }),
                              'Cenário arquivado com motivo e trilha de auditoria.',
                            )
                          }
                        >
                          Arquivar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-[#846859]">
              Nenhum cenário encontrado. Metas do workbook não foram semeadas
              automaticamente.
            </p>
          )}

          <nav
            aria-label="Paginação dos cenários"
            className="flex items-center justify-between border-t border-[#f0e5dc] px-5 py-4 text-sm"
          >
            <span aria-live="polite">
              Página {result.page} de {result.totalPages} · {result.total}{' '}
              cenários
            </span>
            <div className="flex gap-2">
              <PageButton
                disabled={result.page === 1}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: result.page - 1,
                    }),
                  })
                }
              >
                Anterior
              </PageButton>
              <PageButton
                disabled={result.page === result.totalPages}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: result.page + 1,
                    }),
                  })
                }
              >
                Próxima
              </PageButton>
            </div>
          </nav>
        </section>

        {result.canWrite ? (
          <ScenarioEditor
            form={form}
            editing={editing !== null}
            products={result.activeProducts}
            selectedProduct={selectedProduct}
            saving={saving}
            onSubmit={submit}
            onChange={change}
            onMixChange={editMix}
            onSelectedProduct={setSelectedProduct}
            onAddProduct={addProduct}
            onRemoveProduct={(index) =>
              setForm((current) => ({
                ...current,
                mix: current.mix.filter((_, rowIndex) => rowIndex !== index),
              }))
            }
            onCancel={() => {
              setEditing(null)
              setForm(emptyForm)
            }}
          />
        ) : (
          <aside className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#573524]">
            <h2 className="font-bold">Visualização gerencial</h2>
            <p className="mt-2">
              Gerentes podem consultar versões e projeções. Somente o Dono cria,
              edita, ativa, substitui ou arquiva cenários.
            </p>
          </aside>
        )}
      </div>
    </ManagementLayout>
  )
}

function ActiveScenario({
  scenario,
  realized,
}: {
  scenario: ReturnType<typeof Route.useLoaderData>['activeScenario']
  realized: ScenarioRealizedComparison | null
}) {
  if (!scenario)
    return (
      <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <h2 className="font-bold">Versão ativa</h2>
        <p className="mt-2 text-sm text-[#846859]">
          Nenhum cenário está ativo. Crie um rascunho e valide todas as
          premissas antes da ativação.
        </p>
      </section>
    )

  const projection = scenario.projection
  return (
    <section className="rounded-2xl border border-[#dec7b6] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#a64f23]">
            Meta · premissas · projeção
          </p>
          <h2 className="mt-1 text-xl font-black">
            {scenario.name} · versão {scenario.version}
          </h2>
          <p className="mt-1 text-sm text-[#846859]">
            Vigência {scenario.effectiveOn}. Estes valores são estimativas, não
            resultados realizados.
          </p>
        </div>
        <span className="rounded-full bg-[#f7e3ce] px-3 py-1 text-xs font-bold text-[#75411f]">
          Cenário ativo
        </span>
      </div>

      {projection ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Margem necessária antes dos custos fixos"
              value={formatBrlMoney(projection.marginNeededBeforeFixedCosts)}
            />
            <Metric
              label="Faturamento-alvo"
              value={formatBrlMoney(projection.targetRevenue)}
            />
            <Metric
              label="Lucro gerado pelo mix"
              value={formatBrlMoney(projection.mixGeneratedProfit)}
            />
            <Metric
              label="Lucro gerencial projetado"
              value={formatBrlMoney(projection.projectedManagerialProfit)}
            />
            <Metric
              label="Folga ou diferença para a meta"
              value={formatBrlMoney(projection.gapToTarget)}
            />
            <Metric
              label="Unidades necessárias no mês"
              value={projection.unitsPerMonth}
            />
            <Metric
              label="Unidades necessárias na semana"
              value={projection.unitsPerWeek}
            />
            <Metric
              label="Ticket médio-alvo por unidade planejada"
              value={
                projection.targetAverageTicket
                  ? formatBrlMoney(projection.targetAverageTicket)
                  : 'Dado ausente'
              }
            />
          </dl>
          <p className="mt-4 rounded-lg bg-[#fff5e7] p-3 text-xs text-[#75411f]">
            Mix original: {formatRate(projection.originalMixTotal)}. Mix
            interno: 100,00% por normalização proporcional e resíduo
            determinístico. Reserva projetada:{' '}
            {formatBrlMoney(projection.feeTaxReserve)}.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#4a2114] text-white">
                <tr>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Mix planejado</th>
                  <th className="px-3 py-2">Qtd. mês</th>
                  <th className="px-3 py-2">Qtd. semana</th>
                  <th className="px-3 py-2">Faturamento projetado</th>
                  <th className="px-3 py-2">Margem projetada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e5dc]">
                {projection.productLines.map(
                  (line: ScenarioProjection['productLines'][number]) => (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 font-bold">
                        {line.productName}
                        {line.belowMinimumMargin ? (
                          <span className="ml-2 text-xs text-[#a63c23]">
                            abaixo da margem mínima
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {formatBps(line.normalizedWeightBps)}
                      </td>
                      <td className="px-3 py-2">{line.quantityPerMonth}</td>
                      <td className="px-3 py-2">{line.quantityPerWeek}</td>
                      <td className="px-3 py-2">
                        {formatBrlMoney(line.projectedRevenue)}
                      </td>
                      <td className="px-3 py-2">
                        {formatBrlMoney(line.projectedMargin)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]">
          Premissa pendente: {scenario.projectionMessage}
        </p>
      )}

      <div className="mt-6 border-t border-[#eadbd0] pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#35615d]">
          Resultado realizado
        </p>
        {!realized || realized.status === 'missing' ? (
          <div className="mt-2 rounded-lg border border-dashed border-[#c7b8aa] p-4 text-sm text-[#735d50]">
            <p>Dado ausente para o período de vigência.</p>
            <p className="mt-1">
              Lucro gerencial realizado: decisão financeira ainda não homologada
              para classificar despesas variáveis e fixas.
            </p>
          </div>
        ) : (
          <>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Receita líquida realizada"
                value={formatBrlMoney(realized.netRevenue)}
              />
              <Metric
                label="CMV FIFO realizado"
                value={formatBrlMoney(realized.cogs)}
              />
              <Metric
                label="Margem bruta realizada"
                value={formatBrlMoney(realized.grossMargin)}
              />
            </dl>
            <p className="mt-3 text-xs text-[#846859]">
              Lucro gerencial realizado permanece indisponível até homologar a
              classificação das despesas. Fluxo de caixa não é usado como
              substituto.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wide text-[#35615d]">
                  Comparação futura: planejado versus realizado por produto
                </caption>
                <thead className="bg-[#f3ece6] text-[#573524]">
                  <tr>
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2">Receita planejada</th>
                    <th className="px-3 py-2">Receita realizada</th>
                    <th className="px-3 py-2">Margem planejada</th>
                    <th className="px-3 py-2">Margem realizada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e5dc]">
                  {realized.productLines.map((line) => (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 font-bold">
                        {line.productName}
                      </td>
                      <td className="px-3 py-2">
                        {formatBrlMoney(line.plannedRevenue)}
                      </td>
                      <td className="px-3 py-2">
                        {line.realizedRevenue === null
                          ? 'Dado ausente'
                          : formatBrlMoney(line.realizedRevenue)}
                      </td>
                      <td className="px-3 py-2">
                        {formatBrlMoney(line.plannedMargin)}
                      </td>
                      <td className="px-3 py-2">
                        {line.realizedMargin === null
                          ? 'Dado ausente'
                          : formatBrlMoney(line.realizedMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function ScenarioEditor({
  form,
  editing,
  products,
  selectedProduct,
  saving,
  onSubmit,
  onChange,
  onMixChange,
  onSelectedProduct,
  onAddProduct,
  onRemoveProduct,
  onCancel,
}: {
  form: ScenarioForm
  editing: boolean
  products: ActiveProductOption[]
  selectedProduct: string
  saving: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onChange: <TField extends keyof ScenarioForm>(
    field: TField,
    value: ScenarioForm[TField],
  ) => void
  onMixChange: (index: number, field: keyof MixFormRow, value: string) => void
  onSelectedProduct: (value: string) => void
  onAddProduct: () => void
  onRemoveProduct: (index: number) => void
  onCancel: () => void
}) {
  const names = new Map<number, string>(
    products.map((product: ActiveProductOption) => [product.id, product.name]),
  )
  return (
    <form
      className="space-y-4 rounded-2xl border border-[#ecdfd4] bg-white p-5"
      onSubmit={onSubmit}
    >
      <div>
        <h2 className="font-bold">
          {editing ? 'Editar rascunho' : 'Novo cenário'}
        </h2>
        <p className="mt-1 text-xs text-[#846859]">
          Nenhum valor do workbook é criado automaticamente. Informe premissas
          verificadas pelo Dono.
        </p>
      </div>
      <Field
        label="Nome"
        value={form.name}
        onChange={(value) => onChange('name', value)}
      />
      <label className="block text-sm font-bold text-[#573524]">
        Descrição opcional
        <textarea
          className="field mt-1.5 min-h-20"
          value={form.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </label>
      <Field
        label="Data de vigência"
        type="date"
        value={form.effectiveOn}
        onChange={(value) => onChange('effectiveOn', value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Meta de lucro mensal (R$)"
          value={form.monthlyProfitGoal}
          onChange={(value) => onChange('monthlyProfitGoal', value)}
        />
        <Field
          label="Custos fixos mensais (R$)"
          value={form.fixedMonthlyCosts}
          onChange={(value) => onChange('fixedMonthlyCosts', value)}
        />
        <Field
          label="Dias de venda no mês"
          inputMode="numeric"
          value={form.salesDaysPerMonth}
          onChange={(value) => onChange('salesDaysPerMonth', value)}
        />
        <Field
          label="Semanas no mês"
          value={form.weeksPerMonth}
          onChange={(value) => onChange('weeksPerMonth', value)}
        />
        <Field
          label="Margem mínima (0,70 = 70%)"
          value={form.minimumMarginRate}
          onChange={(value) => onChange('minimumMarginRate', value)}
        />
        <Field
          label="Reserva de taxas e impostos (0,03 = 3%)"
          value={form.feeTaxReserveRate}
          onChange={(value) => onChange('feeTaxReserveRate', value)}
        />
      </div>

      <fieldset className="space-y-3 border-t border-[#eadbd0] pt-4">
        <legend className="font-bold">Mix planejado por produto</legend>
        <p className="text-xs text-[#846859]">
          O peso original fica preservado. O sistema normaliza proporcionalmente
          para 100% e distribui resíduos pelo maior resto, com desempate pelo
          menor ID do produto.
        </p>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs font-bold text-[#573524]">
            Produto ativo
            <select
              className="field mt-1"
              value={selectedProduct}
              onChange={(event) => onSelectedProduct(event.target.value)}
            >
              <option value="">Selecione</option>
              {products.map((product: ActiveProductOption) => (
                <option value={product.id} key={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold"
            onClick={onAddProduct}
          >
            Adicionar
          </button>
        </div>
        {form.mix.length ? (
          <div className="space-y-3">
            {form.mix.map((row, index) => (
              <div
                className="rounded-xl border border-[#eadbd0] p-3"
                key={row.productId}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {names.get(row.productId) ?? `Produto ${row.productId}`}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-bold text-[#a63c23]"
                    onClick={() => onRemoveProduct(index)}
                  >
                    Remover
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Peso original"
                    value={row.originalWeight}
                    onChange={(value) =>
                      onMixChange(index, 'originalWeight', value)
                    }
                  />
                  <Field
                    label="Preço planejado (R$)"
                    value={row.plannedUnitPrice}
                    onChange={(value) =>
                      onMixChange(index, 'plannedUnitPrice', value)
                    }
                  />
                  <Field
                    label="Custo unitário planejado (R$)"
                    value={row.plannedUnitCost}
                    onChange={(value) =>
                      onMixChange(index, 'plannedUnitCost', value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[#c7b8aa] p-3 text-xs text-[#735d50]">
            Mix vazio. O rascunho pode ser salvo, mas não pode ser ativado.
          </p>
        )}
      </fieldset>
      <div className="flex gap-3">
        <button
          disabled={saving}
          className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar rascunho'}
        </button>
        {editing ? (
          <button
            type="button"
            className="text-sm font-bold"
            onClick={onCancel}
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode = 'decimal',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="block text-xs font-bold text-[#573524]">
      {label}
      <input
        className="field mt-1"
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8f4ee] p-3">
      <dt className="text-xs font-bold text-[#846859]">{label}</dt>
      <dd className="mt-1 text-lg font-black text-[#4a2114]">{value}</dd>
    </div>
  )
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-[#d9c4b5] px-3 py-2 text-xs font-bold disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function formatBps(value: number) {
  const bps = BigInt(value)
  return `${bps / 100n},${String(bps % 100n).padStart(2, '0')}%`
}

function formatRate(value: string) {
  const normalized = value.replace(',', '.')
  const [whole, fraction = ''] = normalized.split('.')
  const millionths =
    BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
  const hundredthsOfPercent = (millionths + 50n) / 100n
  return `${hundredthsOfPercent / 100n},${String(hundredthsOfPercent % 100n).padStart(2, '0')}%`
}

function ScenarioPending() {
  return (
    <ManagementLayout
      title="Metas e cenários"
      description="Carregando premissas e versões."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm"
      >
        Carregando cenários…
      </p>
    </ManagementLayout>
  )
}

function ScenarioError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Metas e cenários"
      description="Não foi possível carregar as premissas e versões."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>{error.message || 'Tente novamente em alguns instantes.'}</p>
        <button
          className="mt-3 rounded-lg border border-[#75411f] px-3 py-2 text-xs font-bold"
          onClick={() => void router.invalidate()}
        >
          Tentar novamente
        </button>
      </div>
    </ManagementLayout>
  )
}
