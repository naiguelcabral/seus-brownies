import { useMemo, useState } from 'react'
import { CheckCircle2, Eye, Plus, Trash2 } from 'lucide-react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { compareOutputYield } from '#/features/production/output-yield'
import { formatBrlMoney } from '#/lib/format-money'
import { ingredientShortfalls } from '#/features/production/ingredient-shortfalls'
import { productionCostDivergenceMessages } from '#/features/production/cost-reconciliation'
import {
  completeProductionBatch,
  createProductionBatch,
  getProductionBatch,
  getProductionWorkspace,
  previewProductionBatch,
} from '#/features/production/functions'

const productionStatuses = [
  'draft',
  'planned',
  'completed',
  'cancelled',
] as const

const productionSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(productionStatuses).optional().catch(undefined),
  productId: z.coerce.number().int().positive().optional().catch(undefined),
  start: z.string().date().optional().catch(undefined),
  end: z.string().date().optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/producao')({
  validateSearch: productionSearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    status: search.status,
    productId: search.productId,
    start: search.start,
    end: search.end,
    page: search.page,
  }),
  loader: ({ deps }) => getProductionWorkspace({ data: deps }),
  component: ProductionPage,
  pendingComponent: ProductionPending,
  pendingMs: 300,
  errorComponent: ProductionError,
})

type Output = { productId: string; quantity: string }
type Loss = { productId: string; quantity: string; reason: string }

const emptyOutput = (): Output => ({ productId: '', quantity: '' })
const emptyLoss = (): Loss => ({ productId: '', quantity: '', reason: '' })
const statusLabel = {
  draft: 'Rascunho',
  planned: 'Planejamento histórico',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

function ProductionPage() {
  const workspace = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: Route.fullPath })
  const previewBatch = useServerFn(previewProductionBatch)
  const createBatch = useServerFn(createProductionBatch)
  const readBatch = useServerFn(getProductionBatch)
  const completeBatch = useServerFn(completeProductionBatch)
  const [recipeVersionId, setRecipeVersionId] = useState(
    String(workspace.recipes[0]?.id ?? ''),
  )
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [recipeMultiplier, setRecipeMultiplier] = useState('1')
  const [outputs, setOutputs] = useState<Output[]>([emptyOutput()])
  const [bordinhasQuantity, setBordinhasQuantity] = useState('')
  const [losses, setLosses] = useState<Loss[]>([])
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewProductionBatch>
  > | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState<Awaited<
    ReturnType<typeof getProductionBatch>
  > | null>(null)
  const selectedRecipeId = Number(recipeVersionId)
  const profiles = useMemo(
    () =>
      workspace.profiles.filter(
        (profile) => profile.recipeVersionId === selectedRecipeId,
      ),
    [selectedRecipeId, workspace.profiles],
  )
  const bordinhas = profiles.find(
    (profile) => profile.sku === 'PROD002' && profile.name === 'Bordinhas',
  )
  const selectableProfiles = profiles.filter(
    (profile) => profile.productId !== bordinhas?.productId,
  )
  const historyProducts = useMemo(
    () =>
      Array.from(
        new Map(
          workspace.profiles.map((profile) => [
            profile.productId,
            { id: profile.productId, name: profile.name },
          ]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [workspace.profiles],
  )

  function payload() {
    return {
      recipeVersionId: selectedRecipeId,
      productionDate,
      recipeMultiplier,
      outputs: outputs.map((output) => ({
        productId: Number(output.productId),
        quantity: output.quantity,
      })),
      bordinhasQuantity: bordinhasQuantity || undefined,
      losses: losses.map((loss) => ({
        productId: Number(loss.productId),
        quantity: loss.quantity,
        reason: loss.reason,
      })),
      notes,
    }
  }

  function updateOutput(index: number, patch: Partial<Output>) {
    setOutputs(
      outputs.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )
    setPreview(null)
  }
  function updateLoss(index: number, patch: Partial<Loss>) {
    setLosses(
      losses.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )
    setPreview(null)
  }
  function basicValidation() {
    if (!selectedRecipeId || !productionDate || !recipeMultiplier) {
      setMessage('Selecione a receita, a data e o multiplicador do lote.')
      return false
    }
    if (outputs.some((output) => !output.productId || !output.quantity)) {
      setMessage('Informe produto e quantidade em todas as saídas principais.')
      return false
    }
    if (
      losses.some(
        (loss) =>
          !loss.productId || !loss.quantity || loss.reason.trim().length < 3,
      )
    ) {
      setMessage('Cada perda manual precisa de produto, quantidade e motivo.')
      return false
    }
    return true
  }
  async function showPreview() {
    if (!basicValidation()) return
    setSaving(true)
    setMessage(null)
    try {
      const nextPreview = await previewBatch({ data: payload() })
      setPreview(nextPreview)
      setBordinhasQuantity((value) => value || nextPreview.bordinhas.suggested)
    } catch (error) {
      setPreview(null)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível calcular a prévia.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function saveDraft() {
    if (!basicValidation()) return
    setSaving(true)
    setMessage(null)
    try {
      const created = await createBatch({ data: payload() })
      setMessage(
        `Lote #${created.id} criado como rascunho. Revise e conclua quando estiver pronto.`,
      )
      setPreview(null)
      setOutputs([emptyOutput()])
      setBordinhasQuantity('')
      setLosses([])
      setNotes('')
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o rascunho.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function openDetails(id: number) {
    setMessage(null)
    try {
      setDetails(await readBatch({ data: { id } }))
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir o lote.',
      )
    }
  }
  async function conclude() {
    if (!details || details.batch.status !== 'draft') return
    if (
      !window.confirm(
        'Concluir este lote? O estoque e os custos serão atualizados em uma única operação.',
      )
    )
      return
    setSaving(true)
    setMessage(null)
    try {
      const completed = await completeBatch({ data: { id: details.batch.id } })
      setMessage(
        `Lote #${completed.id} concluído. Custo total: ${currency.format(Number(completed.totalCost))}.`,
      )
      setDetails(await readBatch({ data: { id: details.batch.id } }))
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o lote.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ManagementLayout
      title="Produção"
      description="Crie rascunhos, confira a capacidade e conclua lotes reais. Os planejamentos históricos permanecem apenas como referência e nunca movimentam estoque."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Lotes reais</h2>
            <p className="mt-1 text-sm text-[#846859]">
              A lista não mistura os registros PLAN importados do workbook.
            </p>
          </div>
          <form
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] px-5 py-4"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void navigate({
                search: {
                  query: String(form.get('query') ?? '').trim() || undefined,
                  status:
                    (String(form.get('status') ?? '') as
                      (typeof productionStatuses)[number] | '') || undefined,
                  productId: Number(form.get('productId')) || undefined,
                  start: String(form.get('start') ?? '') || undefined,
                  end: String(form.get('end') ?? '') || undefined,
                  page: 1,
                },
              })
            }}
          >
            <label className="text-xs font-bold text-[#573524]">
              Receita
              <input
                className="field mt-1 block min-w-44"
                name="query"
                defaultValue={search.query}
                placeholder="Buscar receita"
              />
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Status
              <select
                className="field mt-1 block"
                name="status"
                defaultValue={search.status}
              >
                <option value="">Todos</option>
                {productionStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Produto
              <select
                className="field mt-1 block min-w-44"
                name="productId"
                defaultValue={search.productId ?? ''}
              >
                <option value="">Todos</option>
                {historyProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-[#573524]">
              De
              <input
                className="field mt-1 block"
                type="date"
                name="start"
                defaultValue={search.start}
              />
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Até
              <input
                className="field mt-1 block"
                type="date"
                name="end"
                defaultValue={search.end}
              />
            </label>
            <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold text-[#4a2114]">
              Filtrar
            </button>
            {search.query ||
            search.status ||
            search.productId ||
            search.start ||
            search.end ? (
              <button
                type="button"
                className="px-2 py-2 text-xs font-bold text-[#75411f]"
                onClick={() => void navigate({ search: { page: 1 } })}
              >
                Limpar filtros
              </button>
            ) : null}
          </form>
          {workspace.batches.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {workspace.batches.map((batch) => (
                <li
                  key={batch.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-bold">
                      Lote #{batch.id} ·{' '}
                      {batch.recipeName ?? 'Receita indisponível'} v
                      {batch.recipeVersion ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#896d5b]">
                      {batch.plannedFor
                        ? formatDate(batch.plannedFor)
                        : 'Data não informada'}{' '}
                      · multiplicador{' '}
                      {formatQuantity(batch.recipeMultiplier, '')} ·{' '}
                      {statusLabel[batch.status]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {batch.totalCost ? (
                      <strong>
                        {currency.format(Number(batch.totalCost))}
                      </strong>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openDetails(batch.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d9c3b4] px-3 py-2 text-sm font-bold text-[#6c3e28]"
                    >
                      <Eye size={16} /> Ver
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Nenhum lote real encontrado para esses filtros." />
          )}
          <nav
            className="flex items-center justify-between gap-3 border-t border-[#f0e5dc] px-5 py-4 text-sm"
            aria-label="Paginação dos lotes de produção"
          >
            <span aria-live="polite">
              Página {workspace.page} de {workspace.totalPages} ·{' '}
              {workspace.total} {workspace.total === 1 ? 'lote' : 'lotes'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#d9c4b5] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                disabled={workspace.page === 1}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: workspace.page - 1,
                    }),
                  })
                }
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#d9c4b5] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                disabled={workspace.page === workspace.totalPages}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: workspace.page + 1,
                    }),
                  })
                }
              >
                Próxima
              </button>
            </div>
          </nav>
        </section>
        {workspace.recipes.length ? (
          <form
            className="space-y-4 rounded-2xl border border-[#ecdfd4] bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault()
              void saveDraft()
            }}
          >
            <div>
              <h2 className="font-bold">Novo lote</h2>
              <p className="mt-1 text-sm text-[#846859]">
                O rascunho ainda não consome ou gera estoque.
              </p>
            </div>
            <label className="block text-sm font-bold text-[#573524]">
              Receita-base ativa
              <select
                className="field mt-1.5"
                value={recipeVersionId}
                onChange={(event) => {
                  setRecipeVersionId(event.target.value)
                  setOutputs([emptyOutput()])
                  setBordinhasQuantity('')
                  setPreview(null)
                }}
              >
                {workspace.recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} · versão {recipe.version}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Data do lote"
                value={productionDate}
                onChange={setProductionDate}
                type="date"
              />
              <Input
                label="Multiplicador"
                value={recipeMultiplier}
                onChange={(value) => {
                  setRecipeMultiplier(value)
                  setPreview(null)
                }}
                inputMode="decimal"
                placeholder="Ex.: 1,5"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">Produtos principais</strong>
                <span className="text-xs text-[#896d5b]">
                  Rendimento por receita
                </span>
              </div>
              {outputs.map((output, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#ead9ca] p-3"
                >
                  <div className="mb-2 flex justify-between">
                    <strong className="text-sm">Saída {index + 1}</strong>
                    {outputs.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOutputs(
                            outputs.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                          setPreview(null)
                        }}
                        className="text-[#a64f23]"
                        aria-label="Remover saída"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                  <label className="block text-sm font-bold text-[#573524]">
                    Produto final
                    <select
                      className="field mt-1.5"
                      value={output.productId}
                      onChange={(event) =>
                        updateOutput(index, { productId: event.target.value })
                      }
                    >
                      <option value="">Selecione</option>
                      {selectableProfiles.map((profile) => (
                        <option
                          key={profile.productId}
                          value={profile.productId}
                        >
                          {profile.name} · rende{' '}
                          {formatQuantity(profile.expectedYield, 'un.')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Quantidade gerada"
                    value={output.quantity}
                    onChange={(value) =>
                      updateOutput(index, { quantity: value })
                    }
                    inputMode="decimal"
                    placeholder="Ex.: 24"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOutputs([...outputs, emptyOutput()])}
                className="inline-flex items-center gap-1 text-sm font-bold text-[#a64f23]"
              >
                <Plus size={16} /> Adicionar produto
              </button>
            </div>
            <div className="rounded-xl bg-[#fff7ec] p-3">
              <label className="block text-sm font-bold text-[#573524]">
                Bordinhas (coproduto)
                <input
                  className="field mt-1.5"
                  value={bordinhasQuantity}
                  onChange={(event) => {
                    setBordinhasQuantity(event.target.value)
                    setPreview(null)
                  }}
                  inputMode="decimal"
                  placeholder="Calcular pela capacidade restante"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-[#846859]">
                O valor sugerido é calculado pela capacidade livre. Se informar
                menos, registre a diferença como perda manual de Bordinhas com
                motivo.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">Perdas manuais (exceção)</strong>
                {losses.length ? null : (
                  <button
                    type="button"
                    onClick={() => setLosses([emptyLoss()])}
                    className="text-sm font-bold text-[#a64f23]"
                  >
                    Adicionar
                  </button>
                )}
              </div>
              {losses.map((loss, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#ead9ca] p-3"
                >
                  <div className="mb-2 flex justify-between">
                    <strong className="text-sm">Perda {index + 1}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        setLosses(
                          losses.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="text-[#a64f23]"
                      aria-label="Remover perda"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="block text-sm font-bold text-[#573524]">
                    Produto
                    <select
                      className="field mt-1.5"
                      value={loss.productId}
                      onChange={(event) =>
                        updateLoss(index, { productId: event.target.value })
                      }
                    >
                      <option value="">Selecione</option>
                      {[
                        ...selectableProfiles,
                        ...(bordinhas ? [bordinhas] : []),
                      ].map((profile) => (
                        <option
                          value={profile.productId}
                          key={profile.productId}
                        >
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Input
                      label="Quantidade"
                      value={loss.quantity}
                      onChange={(value) =>
                        updateLoss(index, { quantity: value })
                      }
                      inputMode="decimal"
                    />
                    <Input
                      label="Motivo"
                      value={loss.reason}
                      onChange={(value) => updateLoss(index, { reason: value })}
                    />
                  </div>
                </div>
              ))}
              {losses.length ? (
                <button
                  type="button"
                  onClick={() => setLosses([...losses, emptyLoss()])}
                  className="text-sm font-bold text-[#a64f23]"
                >
                  Adicionar outra perda
                </button>
              ) : null}
            </div>
            <label className="block text-sm font-bold text-[#573524]">
              Observações
              <textarea
                className="field mt-1.5 min-h-20"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {message ? (
              <p className="rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]">
                {message}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => void showPreview()}
                className="rounded-lg border border-[#d9c3b4] px-4 py-2.5 text-sm font-bold text-[#6c3e28] disabled:opacity-60"
              >
                {saving ? 'Calculando...' : 'Ver prévia'}
              </button>
              <button
                disabled={saving}
                className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Salvar rascunho
              </button>
            </div>
          </form>
        ) : (
          <aside className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
            <h2 className="font-bold">Novo lote indisponível</h2>
            <Empty text="Não há receita-base ativa. Importe ou ative uma receita antes de iniciar uma produção real." />
          </aside>
        )}
      </div>
      {preview ? <Preview preview={preview} /> : null}
      {details ? (
        <Details
          details={details}
          saving={saving}
          onClose={() => setDetails(null)}
          onComplete={() => void conclude()}
        />
      ) : null}
    </ManagementLayout>
  )
}

function Preview({
  preview,
}: {
  preview: Awaited<ReturnType<typeof previewProductionBatch>>
}) {
  const shortfalls = ingredientShortfalls(preview.consumptions)
  return (
    <section className="mt-6 rounded-2xl border border-[#d6c2b3] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold">Prévia antes do rascunho</h2>
          <p className="mt-1 text-sm text-[#846859]">
            O custo usa média ponderada dos movimentos disponíveis; a conclusão
            revalida tudo em transação.
          </p>
        </div>
        <div className="text-right">
          <strong className="block text-lg">
            {currency.format(Number(preview.totalCost))}
          </strong>
          <span className="text-xs text-[#896d5b]">
            {currency.format(Number(preview.unitCost))} por unidade produzida
          </span>
        </div>
      </div>
      {shortfalls.length > 0 ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[#b65624] bg-[#fff7ec] p-3 text-sm"
        >
          <strong>Insumos insuficientes para concluir o lote</strong>
          <ul className="mt-2 list-disc pl-5">
            {shortfalls.map((item) => (
              <li key={item.productId}>
                {item.productName}: faltam {item.shortfall} {item.unit}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            A conclusão revalida o estoque disponível na transação.
          </p>
        </div>
      ) : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article>
          <h3 className="font-bold">Capacidade e saídas</h3>
          <p className="mt-2 text-sm text-[#846859]">
            Ocupação: {formatQuantity(preview.capacity.occupied, 'receitas')} de{' '}
            {formatQuantity(preview.capacity.multiplier, 'receitas')} ·
            restante: {formatQuantity(preview.capacity.remaining, 'receitas')}
          </p>
          <p className="mt-1 text-sm text-[#846859]">
            Bordinhas sugeridas:{' '}
            {formatQuantity(preview.bordinhas.suggested, 'un.')}
          </p>
          <ul className="mt-3 divide-y divide-[#f0e5dc]">
            {preview.outputs.map((output) => (
              <li
                key={output.productId}
                className="flex justify-between py-2 text-sm"
              >
                <span>
                  {output.productName}
                  {output.productName === 'Bordinhas' ? ' · coproduto' : ''}
                </span>
                <strong>{formatQuantity(output.quantity, output.unit)}</strong>
              </li>
            ))}
          </ul>
        </article>
        <article>
          <h3 className="font-bold">Insumos e estoque</h3>
          <ul className="mt-3 divide-y divide-[#f0e5dc]">
            {preview.consumptions.map((item) => (
              <li
                key={`${item.productId}:${item.source.join('|')}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>
                  <strong>{item.productName}</strong>
                  <small className="block text-[#896d5b]">
                    {item.source.join(' + ')} · disponível{' '}
                    {formatQuantity(item.available, item.unit)}
                  </small>
                </span>
                <span
                  className={
                    item.sufficient ? 'font-bold' : 'font-bold text-[#b65624]'
                  }
                >
                  {formatQuantity(item.quantity, item.unit)}
                  {!item.sufficient ? ' insuficiente' : ''}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="mt-5">
        <h3 className="font-bold">Custos operacionais vigentes</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {preview.operational.map((item) => (
            <div
              key={item.type}
              className="rounded-xl bg-[#fffaf5] p-3 text-sm"
            >
              <strong>
                {item.type === 'energy' ? 'Energia' : 'Mão de obra'}
              </strong>
              <p className="mt-1 text-sm text-[#846859]">
                {formatQuantity(item.quantity, item.unit)} ×{' '}
                {currency.format(Number(item.rate))} (vigente desde{' '}
                {formatDate(item.effectiveFrom)})
              </p>
              <strong className="mt-2 block">
                {currency.format(Number(item.amount))}
              </strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

function Details({
  details,
  saving,
  onClose,
  onComplete,
}: {
  details: Awaited<ReturnType<typeof getProductionBatch>>
  saving: boolean
  onClose: () => void
  onComplete: () => void
}) {
  const { batch } = details
  const draftLossRows = details.plannedLosses.map((item) => {
    const productName = details.outputs.find(
      (output) => output.productId === item.productId,
    )?.productName
    return `${productName ?? `Produto #${item.productId}`} · ${formatQuantity(item.quantity, 'un.')} · ${item.reason}`
  })
  const lossRows = details.losses.length
    ? details.losses.map(
        (item) =>
          `${item.productName} · ${formatQuantity(item.quantity, 'un.')} · ${item.reason}`,
      )
    : draftLossRows.length
      ? draftLossRows.map((row) => `${row} · aguardando conclusão`)
      : ['Nenhuma perda manual registrada.']
  return (
    <section className="mt-6 rounded-2xl border border-[#cdb4a2] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ad572b]">
            Auditoria do lote
          </p>
          <h2 className="mt-1 text-xl font-bold">
            Lote #{batch.id} · {statusLabel[batch.status]}
          </h2>
          <p className="mt-1 text-sm text-[#846859]">
            {batch.recipeName} v{batch.recipeVersion} ·{' '}
            {batch.plannedFor ? formatDate(batch.plannedFor) : 'sem data'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold text-[#6c3e28]"
        >
          Fechar
        </button>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <AuditList
          title="Rendimento e custo alocado por saída"
          rows={details.outputs.map((item) => {
            const yieldFacts = compareOutputYield(
              item.plannedQuantity,
              item.actualQuantity,
            )
            const unit = item.unit ?? 'unit'
            return `${item.productName}${item.role === 'co_product' ? ' · coproduto' : ''} · planejado: ${yieldFacts.planned ?? 'não informado'} ${unit} · realizado: ${yieldFacts.actual ?? 'não informado'} ${unit} · diferença: ${yieldFacts.difference ?? 'não informada'} ${unit} · custo alocado: ${item.allocatedCost === null ? 'não informado' : formatBrlMoney(item.allocatedCost)}`
          })}
        />
        <AuditList
          title="Consumos"
          rows={details.consumptions.map(
            (item) =>
              `${item.productName} · ${formatQuantity(item.quantity, item.unit)} · ${item.totalCost ? currency.format(Number(item.totalCost)) : 'custo pendente'}`,
          )}
        />
        <AuditList
          title="Custos operacionais"
          rows={details.costs.map(
            (item) =>
              `${item.type === 'energy' ? 'Energia' : 'Mão de obra'} · ${formatQuantity(item.quantity ?? '0', item.unit ?? '')} × ${item.unitAmount ? currency.format(Number(item.unitAmount)) : '—'} = ${currency.format(Number(item.amount))}`,
          )}
        />
        <AuditList title="Perdas manuais" rows={lossRows} />
        {batch.status === 'completed' ? (
          <AuditList
            title="Reconciliação de custo do lote e origens FIFO"
            rows={
              details.costReconciliation === null
                ? [
                    'Diagnóstico indisponível: estrutura de dados FIFO ainda não disponível.',
                  ]
                : details.costReconciliation.length === 0
                  ? [
                      'Nenhuma divergência nos custos alocados e origens FIFO consultados.',
                    ]
                  : details.costReconciliation.map(
                      (item) =>
                        `${productionCostDivergenceMessages[item.code]} · saída ${item.outputId ?? 'lote'} · camada ${item.layerId ?? 'ausente'}`,
                    )
            }
          />
        ) : null}
      </div>
      {batch.totalCost ? (
        <p className="mt-5 rounded-xl bg-[#fff7ec] p-3 text-sm">
          <strong>Custo total:</strong>{' '}
          {currency.format(Number(batch.totalCost))} ·{' '}
          <strong>custo unitário:</strong>{' '}
          {batch.unitCost ? currency.format(Number(batch.unitCost)) : '—'}
        </p>
      ) : null}
      {batch.status === 'draft' ? (
        <button
          type="button"
          disabled={saving}
          onClick={onComplete}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          {saving ? 'Concluindo...' : 'Concluir lote e atualizar estoque'}
        </button>
      ) : null}
    </section>
  )
}

function AuditList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <article>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-2 divide-y divide-[#f0e5dc] text-sm text-[#573524]">
        {rows.map((row, index) => (
          <li className="py-2" key={`${title}-${index}`}>
            {row}
          </li>
        ))}
      </ul>
    </article>
  )
}
function ProductionPending() {
  return (
    <ManagementLayout
      title="Produção"
      description="Carregando o histórico de produção."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Carregando lotes…
      </p>
    </ManagementLayout>
  )
}
function ProductionError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Produção"
      description="Não foi possível carregar o histórico de produção."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>{error.message || 'Tente novamente em alguns instantes.'}</p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-[#75411f] px-3 py-2 text-xs font-bold"
          onClick={() => void router.invalidate()}
        >
          Tentar novamente
        </button>
      </div>
    </ManagementLayout>
  )
}
function Input({
  label,
  value,
  onChange,
  ...props
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
>) {
  return (
    <label className="block text-sm font-bold text-[#573524]">
      {label}
      <input
        className="field mt-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  )
}
function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-[#ecdfd4] bg-white p-6 text-sm text-[#846859]">
      {text}
    </p>
  )
}
function formatQuantity(value: string, unit: string) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value))}${unit ? ` ${unit === 'unit' ? 'un.' : unit}` : ''}`
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`))
}
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
