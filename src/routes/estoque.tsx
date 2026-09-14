import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { listInventory } from '#/features/operations/functions'
import {
  recordLossLifecycle,
  recordNegativeAdjustmentLifecycle,
  recordPositiveAdjustmentLifecycle,
  returnSaleLifecycle,
} from '#/features/inventory/lifecycle-writers'
import {
  canSubmitLifecycle,
  createNegativeInventoryFormValues,
  lifecycleErrorMessage,
  validateLifecycleForm,
} from '#/features/inventory/lifecycle-ui'
import { PositiveAdjustmentForm } from '#/features/inventory/positive-adjustment-form'
import { formatDateTime } from '#/lib/format'
import {
  inventoryMovementTypes,
  inventoryProductTypes,
  inventoryReorderStatuses,
} from '#/features/inventory/history'

const inventorySearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  type: z.enum(inventoryProductTypes).optional().catch(undefined),
  reorderStatus: z.enum(inventoryReorderStatuses).optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).catch(1),
  movementQuery: z.string().trim().max(100).optional().catch(undefined),
  movementType: z.enum(inventoryMovementTypes).optional().catch(undefined),
  start: z.string().date().optional().catch(undefined),
  end: z.string().date().optional().catch(undefined),
  movementPage: z.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/estoque')({
  validateSearch: inventorySearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    type: search.type,
    reorderStatus: search.reorderStatus,
    page: search.page,
    movementQuery: search.movementQuery,
    movementType: search.movementType,
    start: search.start,
    end: search.end,
    movementPage: search.movementPage,
  }),
  loader: ({ deps }) => listInventory({ data: deps }),
  component: InventoryPage,
  pendingComponent: InventoryPending,
  pendingMs: 300,
  errorComponent: InventoryError,
})

const movementLabels = {
  purchase: 'Compra',
  production: 'Produção',
  sale: 'Venda',
  adjustment: 'Ajuste',
  loss: 'Perda',
  return: 'Devolução',
}

function InventoryPage() {
  const { balances, movements, actionProducts } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [clientReady, setClientReady] = useState(false)
  useEffect(() => {
    setClientReady(true)
  }, [])
  return (
    <ManagementLayout
      title="Estoque"
      description="O saldo é calculado pela soma das movimentações. Compras entram; vendas confirmadas ou pagas saem."
    >
      {clientReady ? (
        <span data-testid="fifo-lifecycle-client-ready" className="sr-only">
          Interface pronta
        </span>
      ) : null}
      <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <form
          className="flex flex-wrap items-end gap-3"
          role="search"
          aria-label="Filtrar saldos de estoque"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void navigate({
              search: (previous) => ({
                ...previous,
                query: String(form.get('query') ?? '').trim() || undefined,
                type:
                  (String(form.get('type') ?? '') as
                    (typeof inventoryProductTypes)[number] | '') || undefined,
                reorderStatus:
                  (String(form.get('reorderStatus') ?? '') as
                    (typeof inventoryReorderStatuses)[number] | '') ||
                  undefined,
                page: 1,
              }),
            })
          }}
        >
          <label className="flex-1 text-xs font-bold text-[#573524]">
            Produto
            <input
              name="query"
              defaultValue={search.query}
              className="field mt-1 w-full"
              placeholder="Nome ou SKU"
            />
          </label>
          <label className="text-xs font-bold text-[#573524]">
            Tipo
            <select
              name="type"
              defaultValue={search.type}
              className="field mt-1 sm:w-48"
            >
              <option value="">Todos</option>
              <option value="ingredient">Ingredientes</option>
              <option value="packaging">Embalagens</option>
              <option value="finished_product">Produtos finais</option>
            </select>
          </label>
          <label className="text-xs font-bold text-[#573524]">
            Reposição
            <select
              name="reorderStatus"
              defaultValue={search.reorderStatus}
              className="field mt-1 sm:w-48"
            >
              <option value="">Todos</option>
              <option value="reorder">Repor</option>
              <option value="ok">OK</option>
              <option value="not_configured">Não configurado</option>
            </select>
          </label>
          <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold text-[#4a2114]">
            Filtrar
          </button>
          {search.query || search.type || search.reorderStatus ? (
            <button
              type="button"
              className="px-2 py-2 text-xs font-bold text-[#75411f]"
              onClick={() =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    query: undefined,
                    type: undefined,
                    reorderStatus: undefined,
                    page: 1,
                  }),
                })
              }
            >
              Limpar filtros
            </button>
          ) : null}
        </form>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-[#f0e5dc] bg-[#fffaf5] text-xs uppercase text-[#896d5b]">
              <tr>
                <th className="px-3 py-3">Produto</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3">Reposição</th>
                <th className="px-3 py-3 text-right">Saldo calculado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e5dc]">
              {balances.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <strong>{item.name}</strong>
                    <span className="ml-2 text-xs text-[#896d5b]">
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-3 py-3">{typeLabel(item.type)}</td>
                  <td className="px-3 py-3">{item.categoryName ?? '—'}</td>
                  <td className="px-3 py-3">
                    {item.reorderStatus === 'not_configured' ? (
                      <span className="text-[#896d5b]">Não configurado</span>
                    ) : item.reorderStatus === 'reorder' ? (
                      <span className="font-bold text-[#b65624]">
                        Repor · limite{' '}
                        {formatQuantity(item.reorderPoint!, item.unit)}
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-700">
                        OK · limite{' '}
                        {formatQuantity(item.reorderPoint!, item.unit)}
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-bold ${item.reorderStatus === 'reorder' ? 'text-[#b65624]' : ''}`}
                  >
                    {formatQuantity(item.balance, item.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {balances.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#846859]">
              Nenhum produto encontrado.
            </p>
          ) : null}
        </div>
        <Pagination
          label="Paginação dos saldos de estoque"
          page={balances.page}
          totalPages={balances.totalPages}
          total={balances.total}
          singular="produto"
          plural="produtos"
          onPage={(page) =>
            navigate({
              search: (previous) => ({ ...previous, page }),
            })
          }
        />
      </section>
      <LifecycleActions products={actionProducts} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
        <div className="border-b border-[#f0e5dc] px-5 py-4">
          <h2 className="font-bold">Histórico de movimentações</h2>
        </div>
        <form
          className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] px-5 py-4"
          role="search"
          aria-label="Filtrar razão de estoque"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void navigate({
              search: (previous) => ({
                ...previous,
                movementQuery:
                  String(form.get('movementQuery') ?? '').trim() || undefined,
                movementType:
                  (String(form.get('movementType') ?? '') as
                    (typeof inventoryMovementTypes)[number] | '') || undefined,
                start: String(form.get('start') ?? '') || undefined,
                end: String(form.get('end') ?? '') || undefined,
                movementPage: 1,
              }),
            })
          }}
        >
          <label className="flex-1 text-xs font-bold text-[#573524]">
            Produto ou fornecedor
            <input
              name="movementQuery"
              defaultValue={search.movementQuery}
              className="field mt-1 w-full"
              placeholder="Nome, SKU ou fornecedor"
            />
          </label>
          <label className="text-xs font-bold text-[#573524]">
            Movimento
            <select
              name="movementType"
              defaultValue={search.movementType}
              className="field mt-1"
            >
              <option value="">Todos</option>
              {inventoryMovementTypes.map((type) => (
                <option key={type} value={type}>
                  {movementLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#573524]">
            De
            <input
              name="start"
              type="date"
              defaultValue={search.start}
              className="field mt-1"
            />
          </label>
          <label className="text-xs font-bold text-[#573524]">
            Até
            <input
              name="end"
              type="date"
              defaultValue={search.end}
              className="field mt-1"
            />
          </label>
          <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold text-[#4a2114]">
            Filtrar
          </button>
          {search.movementQuery ||
          search.movementType ||
          search.start ||
          search.end ? (
            <button
              type="button"
              className="px-2 py-2 text-xs font-bold text-[#75411f]"
              onClick={() =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    movementQuery: undefined,
                    movementType: undefined,
                    start: undefined,
                    end: undefined,
                    movementPage: 1,
                  }),
                })
              }
            >
              Limpar filtros
            </button>
          ) : null}
        </form>
        {movements.items.length ? (
          <ul className="divide-y divide-[#f0e5dc]">
            {movements.items.map((movement) => (
              <li
                key={movement.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="font-bold">{movement.productName}</p>
                  <p className="text-xs text-[#896d5b]">
                    {movementLabels[movement.type]} ·{' '}
                    {formatDateTime(movement.occurredAt)}
                  </p>
                  {movement.supplierName ||
                  movement.supplierLot ||
                  movement.expiresOn ? (
                    <p className="mt-1 text-xs text-[#896d5b]">
                      Fornecedor: {movement.supplierName || 'não informado'} ·
                      lote: {movement.supplierLot || 'não informado'} ·
                      validade: {movement.expiresOn || 'não informada'}
                    </p>
                  ) : null}
                </div>
                <strong
                  className={
                    movement.quantityDelta.startsWith('-')
                      ? 'text-[#b65624]'
                      : 'text-emerald-700'
                  }
                >
                  {movement.quantityDelta.startsWith('-') ? '' : '+'}
                  {formatQuantity(movement.quantityDelta, movement.productUnit)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-[#846859]">
            Nenhuma movimentação encontrada para esses filtros.
          </p>
        )}
        <Pagination
          label="Paginação do razão de estoque"
          page={movements.page}
          totalPages={movements.totalPages}
          total={movements.total}
          singular="movimentação"
          plural="movimentações"
          onPage={(movementPage) =>
            navigate({
              search: (previous) => ({ ...previous, movementPage }),
            })
          }
        />
      </section>
    </ManagementLayout>
  )
}

function Pagination({
  label,
  page,
  totalPages,
  total,
  singular,
  plural,
  onPage,
}: {
  label: string
  page: number
  totalPages: number
  total: number
  singular: string
  plural: string
  onPage: (page: number) => void
}) {
  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-[#f0e5dc] px-1 pt-4 text-sm"
      aria-label={label}
    >
      <span aria-live="polite">
        Página {page} de {totalPages} · {total}{' '}
        {total === 1 ? singular : plural}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-[#d9c4b5] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#d9c4b5] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </nav>
  )
}

function InventoryPending() {
  return (
    <ManagementLayout
      title="Estoque"
      description="Carregando saldos e movimentações."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Carregando estoque…
      </p>
    </ManagementLayout>
  )
}

function InventoryError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Estoque"
      description="Não foi possível carregar saldos e movimentações."
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

function LifecycleActions({
  products,
}: {
  products: Array<{ id: number; name: string; sku: string }>
}) {
  const router = useRouter()
  const recordReturn = useServerFn(returnSaleLifecycle)
  const recordLoss = useServerFn(recordLossLifecycle)
  const recordNegative = useServerFn(recordNegativeAdjustmentLifecycle)
  const recordPositive = useServerFn(recordPositiveAdjustmentLifecycle)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [returnValues, setReturnValues] = useState({
    saleItemId: '',
    quantity: '',
    settlement: 'refund',
    occurredOn: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date()),
    reason: '',
    reference: '',
  })
  const [lossValues, setLossValues] = useState(
    createNegativeInventoryFormValues,
  )
  const [negativeAdjustmentValues, setNegativeAdjustmentValues] = useState(
    createNegativeInventoryFormValues,
  )
  const [positiveValues, setPositiveValues] = useState({
    productId: '',
    quantity: '',
    reason: '',
    reference: '',
    totalCost: '',
    originReference: '',
  })
  const [positiveConfirmed, setPositiveConfirmed] = useState(false)
  async function run(
    kind: 'return' | 'loss' | 'negative' | 'positive',
    values: Record<string, string>,
    confirmed = false,
  ) {
    const numeric = {
      ...values,
      ...(kind === 'return'
        ? { saleItemId: Number(values.saleItemId) }
        : { productId: Number(values.productId) }),
    }
    if ((kind === 'loss' || kind === 'negative') && !confirmed) {
      setMessage('Confirme a saída de estoque antes de continuar.')
      return
    }
    if (kind === 'positive' && !confirmed) {
      setMessage(
        'Confirme o impacto do ajuste positivo no estoque e na camada FIFO antes de continuar.',
      )
      return
    }
    setPending(true)
    setMessage(null)
    try {
      if (kind === 'return') {
        const validation = validateLifecycleForm('return', numeric)
        if (!validation.ok) throw new Error(validation.message)
        await recordReturn({ data: validation.data })
      }
      if (kind === 'loss') {
        const validation = validateLifecycleForm('loss', numeric)
        if (!validation.ok) throw new Error(validation.message)
        await recordLoss({ data: validation.data })
      }
      if (kind === 'negative') {
        const validation = validateLifecycleForm('negative', numeric)
        if (!validation.ok) throw new Error(validation.message)
        await recordNegative({ data: validation.data })
      }
      if (kind === 'positive') {
        const validation = validateLifecycleForm('positive', numeric)
        if (!validation.ok) throw new Error(validation.message)
        await recordPositive({ data: validation.data })
      }
      setMessage(
        kind === 'return'
          ? 'Compensação registrada sem retorno ao estoque vendável.'
          : 'Evento FIFO registrado.',
      )
      await router.invalidate()
    } catch (error) {
      setMessage(lifecycleErrorMessage(error))
    } finally {
      setPending(false)
    }
  }
  const product = (value: string, change: (value: string) => void) => (
    <label className="block text-xs font-bold">
      Produto
      <select
        className="field mt-1"
        value={value}
        onChange={(event) => change(event.target.value)}
      >
        <option value="">Selecione</option>
        {products.map((item) => (
          <option value={item.id} key={item.id}>
            {item.name} · {item.sku}
          </option>
        ))}
      </select>
    </label>
  )
  const field = (
    label: string,
    value: string,
    change: (value: string) => void,
    placeholder = '',
  ) => (
    <label className="block text-xs font-bold">
      {label}
      <input
        className="field mt-1"
        value={value}
        placeholder={placeholder}
        onChange={(event) => change(event.target.value)}
      />
    </label>
  )
  return (
    <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <h2 className="font-bold">Ciclo de vida e ajustes</h2>
      <p className="mt-1 text-xs text-[#896d5b]">
        Ajustes de estoque exigem a migration 0013. Compensações pós-entrega
        exigem as migrations 0023 a 0026 e não devolvem alimento ao estoque.
      </p>
      {message ? (
        <p className="mt-3 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]">
          {message}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form
          className="rounded-xl border border-[#ead9ca] p-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            void run('return', returnValues)
          }}
        >
          <strong>Compensação pós-entrega</strong>
          {field('ID do item da venda', returnValues.saleItemId, (value) =>
            setReturnValues({ ...returnValues, saleItemId: value }),
          )}
          {field(
            'Quantidade',
            returnValues.quantity,
            (value) => setReturnValues({ ...returnValues, quantity: value }),
            '1,000',
          )}
          <label className="block text-xs font-bold">
            Decisão
            <select
              className="field mt-1"
              value={returnValues.settlement}
              onChange={(event) =>
                setReturnValues({
                  ...returnValues,
                  settlement: event.target.value,
                })
              }
            >
              <option value="refund">Reembolso</option>
              <option value="store_credit">Crédito futuro</option>
            </select>
          </label>
          <label className="block text-xs font-bold">
            Data do evento
            <input
              className="field mt-1"
              type="date"
              value={returnValues.occurredOn}
              onChange={(event) =>
                setReturnValues({
                  ...returnValues,
                  occurredOn: event.target.value,
                })
              }
            />
          </label>
          {field('Motivo', returnValues.reason, (value) =>
            setReturnValues({ ...returnValues, reason: value }),
          )}
          {field('Referência', returnValues.reference, (value) =>
            setReturnValues({ ...returnValues, reference: value }),
          )}
          <button disabled={pending} className="action-button">
            Registrar compensação
          </button>
        </form>
        <NegativeForm
          title="Perda de estoque"
          values={lossValues}
          setValues={setLossValues}
          product={product}
          field={field}
          pending={pending}
          onSubmit={(confirmed) => run('loss', lossValues, confirmed)}
        />
        <NegativeForm
          title="Ajuste negativo"
          values={negativeAdjustmentValues}
          setValues={setNegativeAdjustmentValues}
          product={product}
          field={field}
          pending={pending}
          onSubmit={(confirmed) =>
            run('negative', negativeAdjustmentValues, confirmed)
          }
        />
        <PositiveAdjustmentForm
          products={products}
          values={positiveValues}
          setValues={setPositiveValues}
          pending={pending}
          confirmed={positiveConfirmed}
          setConfirmed={setPositiveConfirmed}
          onSubmit={() => {
            void run('positive', positiveValues, positiveConfirmed)
          }}
        />
      </div>
    </section>
  )
}

function NegativeForm({
  title,
  values,
  setValues,
  product,
  field,
  pending,
  onSubmit,
}: {
  title: string
  values: {
    productId: string
    quantity: string
    reason: string
    reference: string
  }
  setValues: (values: {
    productId: string
    quantity: string
    reason: string
    reference: string
  }) => void
  product: (value: string, change: (value: string) => void) => React.ReactNode
  field: (
    label: string,
    value: string,
    change: (value: string) => void,
    placeholder?: string,
  ) => React.ReactNode
  pending: boolean
  onSubmit: (confirmed: boolean) => Promise<void>
}) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <form
      className="rounded-xl border border-[#ead9ca] p-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(confirmed)
      }}
    >
      <strong>{title}</strong>
      {product(values.productId, (value) =>
        setValues({ ...values, productId: value }),
      )}
      {field(
        'Quantidade',
        values.quantity,
        (value) => setValues({ ...values, quantity: value }),
        '1,000',
      )}
      {field('Motivo', values.reason, (value) =>
        setValues({ ...values, reason: value }),
      )}
      {field('Referência', values.reference, (value) =>
        setValues({ ...values, reference: value }),
      )}
      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />{' '}
        Confirmo a saída de estoque.
      </label>
      <button
        disabled={!canSubmitLifecycle(pending, true, confirmed)}
        className="action-button"
      >
        Registrar {title.toLocaleLowerCase('pt-BR')}
      </button>
    </form>
  )
}

function formatQuantity(value: string, unit: string) {
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Number(value))} ${unit === 'unit' ? 'un.' : unit}`
}
function typeLabel(type: string) {
  return type === 'ingredient'
    ? 'Ingrediente'
    : type === 'packaging'
      ? 'Embalagem'
      : 'Produto final'
}
