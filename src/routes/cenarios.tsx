import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  ActiveScenario,
  formatRate,
  formatDate,
} from '#/features/scenarios/ScenarioSummary'
import { ScenarioEditor } from '#/features/scenarios/ScenarioEditor'
import type {
  ScenarioForm,
  MixFormRow,
} from '#/features/scenarios/ScenarioEditor'
import { OperationDialog } from '#/components/OperationDialog'
import { ScenarioActionDialog } from '#/features/scenarios/ScenarioActionDialog'
import type { ScenarioAction } from '#/features/scenarios/ScenarioActionDialog'
import { PaymentFeeCalculator } from '#/components/PaymentFeeCalculator'
import { ManagementLayout } from '#/components/ManagementLayout'
import { formatBrlMoney } from '#/lib/format-money'
import { compareProjectionWithRealized } from '#/features/scenarios/calculations'
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [action, setAction] = useState<{
    kind: ScenarioAction
    scenario: (typeof result.scenarios)[number]
  } | null>(null)
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
      try {
        await router.invalidate({ sync: true })
      } catch {
        setMessage(
          `${success} Recarregue a página para consultar os dados atualizados.`,
        )
      }
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
        setEditorOpen(false)
      },
      editing
        ? 'Rascunho atualizado com nova revisão auditada.'
        : 'Cenário criado como rascunho auditado.',
    )
  }

  function startEditing(item: (typeof result.scenarios)[number]) {
    setEditorOpen(true)
    setSelectedProduct('')
    setMessage(null)
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[#846859]">
          A meta é o lucro do conjunto de todas as vendas. Use o mix como
          orientação; acompanhe o resultado registrado no Financeiro.
        </p>
        {result.canWrite ? (
          <div className="flex flex-wrap gap-3">
            {form !== emptyForm ? (
              <button
                type="button"
                disabled={saving}
                className="rounded-lg border border-[#4a2114] px-4 py-2.5 text-sm font-bold"
                onClick={() => {
                  setMessage(null)
                  setEditorOpen(true)
                }}
              >
                Continuar rascunho
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              onClick={() => {
                if (
                  form !== emptyForm &&
                  !window.confirm(
                    'Descartar o preenchimento local e iniciar um novo cenário? O rascunho salvo permanece no histórico.',
                  )
                )
                  return
                setEditing(null)
                setForm(emptyForm)
                setSelectedProduct('')
                setMessage(null)
                setEditorOpen(true)
              }}
            >
              Novo cenário
            </button>
          </div>
        ) : null}
      </div>
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
        paymentFees={result.paymentFees}
      />

      <div className="mt-6 space-y-6">
        <section
          aria-label="Histórico de cenários"
          className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white"
        >
          <h2 className="px-5 pt-5 font-bold">Versões e rascunhos</h2>
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
                          : item.projection
                            ? 'informado em 100%'
                            : 'premissas pendentes'}
                      </p>
                      <details className="mt-3 text-xs text-[#846859]">
                        <summary className="cursor-pointer font-bold">
                          Detalhes desta versão
                        </summary>
                        <p className="mt-2 whitespace-pre-line">
                          {item.description || 'Sem descrição'}
                        </p>
                        <p className="mt-2">
                          Revisão {item.revision} · criado em{' '}
                          {formatDate(item.createdAt)}
                        </p>
                        <p className="mt-2">{item.projectionMessage}</p>
                      </details>
                    </div>
                    {result.canWrite ? (
                      <div className="flex flex-wrap gap-3">
                        {item.status === 'draft' ? (
                          <>
                            <button
                              type="button"
                              disabled={saving}
                              className="text-sm font-bold text-[#a64f23]"
                              onClick={() => startEditing(item)}
                            >
                              Editar rascunho
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              className="rounded-lg bg-[#4a2114] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                              onClick={() => {
                                setMessage(null)
                                setAction({ kind: 'activate', scenario: item })
                              }}
                            >
                              Ativar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={saving}
                            className="text-sm font-bold text-[#a64f23]"
                            onClick={() => {
                              setMessage(null)
                              setAction({ kind: 'version', scenario: item })
                            }}
                          >
                            Criar nova versão
                          </button>
                        )}
                        {item.status !== 'archived' ? (
                          <button
                            type="button"
                            disabled={saving}
                            className="rounded-lg border border-[#75411f] px-3 py-2 text-xs font-bold disabled:opacity-60"
                            onClick={() => {
                              setMessage(null)
                              setAction({ kind: 'archive', scenario: item })
                            }}
                          >
                            Arquivar
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
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

        {result.canWrite && editorOpen ? (
          <OperationDialog
            title={editing ? 'Editar rascunho' : 'Novo cenário'}
            pending={saving}
            onClose={() => setEditorOpen(false)}
          >
            {message ? (
              <p
                role="alert"
                className="m-5 rounded-lg bg-[#fff5e7] p-3 text-sm"
              >
                {message}
              </p>
            ) : null}
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
              onCancel={() => setEditorOpen(false)}
            />
          </OperationDialog>
        ) : !result.canWrite ? (
          <aside className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#573524]">
            <h2 className="font-bold">Visualização gerencial</h2>
            <p className="mt-2">
              Gerentes podem consultar versões e projeções. Somente o Dono cria,
              edita, ativa, substitui ou arquiva cenários.
            </p>
          </aside>
        ) : null}
      </div>
      <details className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <summary className="cursor-pointer font-bold">
          Simular taxas de um pagamento
        </summary>
        <p className="mt-2 text-sm text-[#846859]">
          Compare o recebimento por meio sem registrar uma operação.
        </p>
        <div className="mt-4">
          <PaymentFeeCalculator schedule={result.paymentFees} />
        </div>
      </details>
      {result.canWrite && action ? (
        <ScenarioActionDialog
          key={`${action.kind}:${action.scenario.id}`}
          action={action.kind}
          name={action.scenario.name}
          version={action.scenario.version}
          activeName={result.activeScenario?.name ?? null}
          onCancel={() => setAction(null)}
          onConfirm={async (reason) => {
            if (saving) throw new Error('Aguarde a operação em andamento.')
            setSaving(true)
            setMessage(null)
            try {
              const target = action.scenario
              if (action.kind === 'activate') {
                await activate({
                  data: {
                    id: target.id,
                    expectedRevision: target.revision,
                    reason,
                  },
                })
                setMessage('Cenário ativado com premissas e mix auditados.')
              } else if (action.kind === 'archive') {
                await archive({
                  data: {
                    id: target.id,
                    expectedRevision: target.revision,
                    reason,
                  },
                })
                setMessage(
                  'Cenário arquivado com motivo e trilha de auditoria.',
                )
              } else {
                const created = await createVersion({
                  data: { sourceScenarioId: target.id, reason },
                })
                startEditing({
                  ...target,
                  id: created.id,
                  revision: created.revision,
                })
                setMessage(
                  'Nova versão criada como rascunho; a anterior permaneceu imutável.',
                )
              }
              setAction(null)
              try {
                await router.invalidate({ sync: true })
              } catch {
                setMessage(
                  'Alteração salva. Recarregue a página para consultar as versões atualizadas.',
                )
              }
            } finally {
              setSaving(false)
            }
          }}
        />
      ) : null}
    </ManagementLayout>
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

function ScenarioError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Metas e cenários"
      description="Não foi possível carregar as premissas e versões."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>
          {(error instanceof Error && error.message) ||
            'Tente novamente em alguns instantes.'}
        </p>
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
