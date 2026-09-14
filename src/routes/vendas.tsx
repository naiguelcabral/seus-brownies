import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { hasPermission } from '#/features/auth/authorization'
import {
  createSale,
  listSaleProducts,
  listSales,
} from '#/features/operations/functions'
import { listActiveSalesLocations } from '#/features/locations/functions'
import { cancelSaleLifecycle } from '#/features/inventory/lifecycle-writers'
import {
  canCancelSale,
  canSubmitLifecycle,
  lifecycleErrorMessage,
  validateLifecycleForm,
} from '#/features/inventory/lifecycle-ui'
import { formatDateTime } from '#/lib/format'
import { saleStatuses } from '#/features/operations/sale-history'
import type { SaleStatus } from '#/features/operations/sale-history'

const saleSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(saleStatuses).optional().catch(undefined),
  locationId: z.coerce.number().int().positive().optional().catch(undefined),
  productId: z.coerce.number().int().positive().optional().catch(undefined),
  start: z.string().date().optional().catch(undefined),
  end: z.string().date().optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/vendas')({
  validateSearch: saleSearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    status: search.status,
    locationId: search.locationId,
    productId: search.productId,
    start: search.start,
    end: search.end,
    page: search.page,
  }),
  loader: async ({ context, deps }) => {
    const canReadHistory = Boolean(
      context.appRole && hasPermission(context.appRole, 'sales:read'),
    )
    const canManageLifecycle = Boolean(
      context.appRole && hasPermission(context.appRole, 'fifo:lifecycle:write'),
    )
    const [products, locations] = await Promise.all([
      listSaleProducts(),
      listActiveSalesLocations(),
    ])
    return {
      products,
      locations,
      history: canReadHistory
        ? await listSales({ data: deps })
        : { sales: [], total: 0, page: 1, pageSize: 20, totalPages: 1 },
      canReadHistory,
      canManageLifecycle,
    }
  },
  component: SalesPage,
  pendingComponent: SalesPending,
  pendingMs: 300,
  errorComponent: SalesError,
})
type Item = { productId: string; quantity: string }
const emptyItem = (): Item => ({ productId: '', quantity: '' })
const statusLabels: Record<SaleStatus, string> = {
  draft: 'Rascunho',
  confirmed: 'Confirmada',
  paid: 'Paga',
  cancelled: 'Cancelada',
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function SalesPage() {
  const { products, locations, history, canReadHistory, canManageLifecycle } =
    Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: Route.fullPath })
  const save = useServerFn(createSale)
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  )
  const cancel = useServerFn(cancelSaleLifecycle)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [status, setStatus] = useState<SaleStatus>('draft')
  const [locationId, setLocationId] = useState('')
  const [reportedAmount, setReportedAmount] = useState('')
  const [adjustmentKind, setAdjustmentKind] = useState<
    'none' | 'discount' | 'combo' | 'gift' | 'manual_adjustment'
  >('none')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelledOn, setCancelledOn] = useState(today)
  const [cancelConfirmed, setCancelConfirmed] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  useEffect(() => {
    setClientReady(true)
  }, [])
  function updateItem(index: number, patch: Partial<Item>) {
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )
  }
  async function submitCancellation(saleId: number) {
    const validation = validateLifecycleForm('cancel', {
      saleId,
      occurredOn: cancelledOn,
      reason: cancelReason,
    })
    if (!validation.ok) {
      setMessage(validation.message)
      return
    }
    if (!canSubmitLifecycle(saving, true, cancelConfirmed)) {
      setMessage('Confirme o cancelamento antes de continuar.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await cancel({ data: validation.data })
      setMessage('Venda cancelada; o estoque e o custo foram estornados.')
      setCancellingId(null)
      setCancelReason('')
      setCancelledOn(today())
      setCancelConfirmed(false)
      await router.invalidate()
    } catch (error) {
      setMessage(lifecycleErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !locationId ||
      !reportedAmount ||
      items.some((item) => !item.productId || !item.quantity)
    ) {
      setMessage(
        'Selecione o local, informe o faturamento recebido e complete todos os itens.',
      )
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await save({
        data: {
          idempotencyKey,
          locationId: Number(locationId),
          customerName,
          customerPhone,
          status,
          reportedAmount,
          adjustmentKind,
          adjustmentReason,
          notes,
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
          })),
        },
      })
      setCustomerName('')
      setCustomerPhone('')
      setNotes('')
      setStatus('draft')
      setLocationId('')
      setReportedAmount('')
      setAdjustmentKind('none')
      setAdjustmentReason('')
      setItems([emptyItem()])
      setIdempotencyKey(crypto.randomUUID())
      setMessage(
        status === 'confirmed' || status === 'paid'
          ? 'Venda registrada e estoque baixado.'
          : 'Venda registrada como rascunho, sem baixa de estoque.',
      )
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a venda.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <ManagementLayout
      title="Vendas"
      description="Registre pedidos e vendas. A baixa no estoque é criada automaticamente somente para vendas confirmadas ou pagas."
    >
      {clientReady ? (
        <span data-testid="fifo-lifecycle-client-ready" className="sr-only">
          Interface pronta
        </span>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Vendas recentes</h2>
          </div>
          {!canReadHistory ? (
            <p className="p-6 text-sm text-[#846859]">
              Seu acesso permite registrar vendas, sem consultar o histórico
              financeiro.
            </p>
          ) : (
            <>
              <form
                className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] px-5 py-4"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  const selectedStatus = String(form.get('status') ?? '')
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      query:
                        String(form.get('query') ?? '').trim() || undefined,
                      status: saleStatuses.includes(
                        selectedStatus as SaleStatus,
                      )
                        ? (selectedStatus as SaleStatus)
                        : undefined,
                      locationId: Number(form.get('locationId')) || undefined,
                      productId: Number(form.get('productId')) || undefined,
                      start: String(form.get('start') ?? '') || undefined,
                      end: String(form.get('end') ?? '') || undefined,
                      page: 1,
                    }),
                  })
                }}
              >
                <label className="text-xs font-bold text-[#573524]">
                  Cliente
                  <input
                    className="field mt-1 block min-w-48"
                    name="query"
                    defaultValue={search.query}
                    placeholder="Buscar cliente"
                  />
                </label>
                <label className="text-xs font-bold text-[#573524]">
                  Status
                  <select
                    className="field mt-1 block"
                    name="status"
                    defaultValue={search.status ?? ''}
                  >
                    <option value="">Todos</option>
                    {saleStatuses.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
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
                  Local/canal
                  <select
                    className="field mt-1 block"
                    name="locationId"
                    defaultValue={search.locationId ?? ''}
                  >
                    <option value="">Todos</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#573524]">
                  Produto
                  <select
                    className="field mt-1 block"
                    name="productId"
                    defaultValue={search.productId ?? ''}
                  >
                    <option value="">Todos</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
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
                search.locationId ||
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
              {history.sales.length ? (
                <ul className="divide-y divide-[#f0e5dc]">
                  {history.sales.map((sale) => (
                    <li
                      className="flex items-center justify-between gap-4 px-5 py-4"
                      key={sale.id}
                    >
                      <div>
                        <p className="font-bold">
                          {sale.customerName || 'Cliente não informado'}
                        </p>
                        <p className="mt-1 text-xs text-[#896d5b]">
                          {statusLabels[sale.status]} ·{' '}
                          {formatDateTime(sale.soldAt)} ·{' '}
                          {sale.locationName ?? 'local não informado'}
                        </p>
                        {sale.auditStatus ? (
                          <p className="mt-1 text-xs text-[#896d5b]">
                            Auditoria: {auditStatusLabel(sale.auditStatus)}
                            {sale.reportedAmount && sale.calculatedAmount
                              ? ` · informado ${currency.format(Number(sale.reportedAmount))} · calculado ${currency.format(Number(sale.calculatedAmount))}`
                              : ''}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <strong>
                          {currency.format(Number(sale.totalAmount))}
                        </strong>
                        {canManageLifecycle && canCancelSale(sale.status) ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              setCancellingId(sale.id)
                              setCancelReason('')
                              setCancelledOn(today())
                              setCancelConfirmed(false)
                            }}
                            className="mt-2 block text-xs font-bold text-[#a64f23] disabled:opacity-60"
                          >
                            Cancelar / estornar
                          </button>
                        ) : null}
                      </div>
                      {cancellingId === sale.id ? (
                        <div className="basis-full rounded-lg bg-[#fff5e7] p-3 text-left">
                          <Input
                            label="Motivo do cancelamento"
                            value={cancelReason}
                            onChange={setCancelReason}
                          />
                          <Input
                            label="Data do cancelamento/estorno"
                            type="date"
                            value={cancelledOn}
                            onChange={setCancelledOn}
                          />
                          <label className="mt-2 flex gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={cancelConfirmed}
                              onChange={(event) =>
                                setCancelConfirmed(event.target.checked)
                              }
                            />{' '}
                            Confirmo o estorno de estoque, CMV e, quando a venda
                            estiver paga, do caixa.
                          </label>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={
                                !canSubmitLifecycle(
                                  saving,
                                  true,
                                  cancelConfirmed,
                                )
                              }
                              onClick={() => submitCancellation(sale.id)}
                              className="rounded bg-[#a64f23] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                            >
                              {saving
                                ? 'Estornando...'
                                : 'Confirmar cancelamento'}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setCancellingId(null)}
                              className="text-xs font-bold"
                            >
                              Fechar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-sm text-[#846859]">
                  Nenhuma venda encontrada para esses filtros.
                </p>
              )}
              <nav
                className="flex items-center justify-between gap-3 border-t border-[#f0e5dc] px-5 py-4 text-sm"
                aria-label="Paginação das vendas"
              >
                <span aria-live="polite">
                  Página {history.page} de {history.totalPages} ·{' '}
                  {history.total} {history.total === 1 ? 'venda' : 'vendas'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[#d9c4b5] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    disabled={history.page === 1}
                    onClick={() =>
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          page: history.page - 1,
                        }),
                      })
                    }
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#d9c4b5] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    disabled={history.page === history.totalPages}
                    onClick={() =>
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          page: history.page + 1,
                        }),
                      })
                    }
                  >
                    Próxima
                  </button>
                </div>
              </nav>
            </>
          )}
        </section>
        <form
          className="rounded-2xl border border-[#ecdfd4] bg-white p-5 space-y-4"
          onSubmit={submit}
        >
          <h2 className="font-bold">Nova venda</h2>
          <Input
            label="Cliente"
            value={customerName}
            onChange={setCustomerName}
          />
          <Input
            label="Telefone"
            value={customerPhone}
            onChange={setCustomerPhone}
          />
          <label className="block text-sm font-bold text-[#573524]">
            Local ou canal
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="field mt-1.5"
              required
            >
              <option value="">Selecione</option>
              {locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-[#573524]">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
              className="field mt-1.5"
            >
              {saleStatuses.map((value) => (
                <option value={value} key={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          {items.map((item, index) => (
            <div key={index} className="rounded-xl border border-[#ead9ca] p-3">
              <div className="mb-2 flex justify-between">
                <strong className="text-sm">Item {index + 1}</strong>
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItems(
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="text-[#a64f23]"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
              <label className="block text-sm font-bold text-[#573524]">
                Produto
                <select
                  value={item.productId}
                  onChange={(event) =>
                    updateItem(index, { productId: event.target.value })
                  }
                  className="field mt-1.5"
                >
                  <option value="">Selecione</option>
                  {products.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.name} ·{' '}
                      {currency.format(Number(product.salePrice))}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Quantidade"
                value={item.quantity}
                onChange={(quantity) => updateItem(index, { quantity })}
                placeholder="Ex.: 2,000"
                inputMode="decimal"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setItems([...items, emptyItem()])}
            className="inline-flex items-center gap-1 text-sm font-bold text-[#a64f23]"
          >
            <Plus size={16} />
            Adicionar item
          </button>
          <Input
            label="Faturamento recebido"
            value={reportedAmount}
            onChange={setReportedAmount}
            placeholder="Ex.: 120,00"
            inputMode="decimal"
            required
          />
          <label className="block text-sm font-bold text-[#573524]">
            Motivo da diferença
            <select
              value={adjustmentKind}
              onChange={(event) =>
                setAdjustmentKind(event.target.value as typeof adjustmentKind)
              }
              className="field mt-1.5"
            >
              <option value="none">Sem ajuste</option>
              <option value="discount">Desconto</option>
              <option value="combo">Combo</option>
              <option value="gift">Brinde</option>
              <option value="manual_adjustment">Ajuste manual</option>
            </select>
          </label>
          {adjustmentKind !== 'none' ? (
            <label className="block text-sm font-bold text-[#573524]">
              Justificativa do ajuste
              <textarea
                className="field mt-1.5 min-h-20"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                required
              />
            </label>
          ) : null}
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
          <button
            disabled={saving}
            className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Registrando...' : 'Registrar venda'}
          </button>
        </form>
      </div>
    </ManagementLayout>
  )
}

function SalesPending() {
  return (
    <ManagementLayout
      title="Vendas"
      description="Carregando o histórico de vendas."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Carregando vendas…
      </p>
    </ManagementLayout>
  )
}

function SalesError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Vendas"
      description="Não foi possível carregar o histórico de vendas."
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
    <label className="mt-3 block text-sm font-bold text-[#573524]">
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
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function auditStatusLabel(value: string) {
  if (value === 'normal') return 'normal'
  if (value === 'attention') return 'atenção'
  if (value === 'critical') return 'crítico'
  return 'não classificada'
}
