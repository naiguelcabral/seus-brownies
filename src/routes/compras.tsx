import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { hasPermission } from '#/features/auth/authorization'
import {
  createPurchase,
  listPurchasableProducts,
  listPurchases,
} from '#/features/operations/functions'

const purchaseSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  start: z.string().date().optional().catch(undefined),
  end: z.string().date().optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/compras')({
  validateSearch: purchaseSearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    start: search.start,
    end: search.end,
    page: search.page,
  }),
  loader: async ({ context, deps }) => {
    const canReadHistory = Boolean(
      context.appRole && hasPermission(context.appRole, 'purchases:read'),
    )
    return {
      products: await listPurchasableProducts(),
      history: canReadHistory
        ? await listPurchases({ data: deps })
        : { purchases: [], total: 0, page: 1, pageSize: 20, totalPages: 1 },
      canReadHistory,
    }
  },
  component: PurchasesPage,
  pendingComponent: PurchasesPending,
  pendingMs: 300,
  errorComponent: PurchasesError,
})

type Item = { productId: string; quantity: string; unitCost: string }
const emptyItem = (): Item => ({ productId: '', quantity: '', unitCost: '' })

function PurchasesPage() {
  const { products, history, canReadHistory } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: Route.fullPath })
  const save = useServerFn(createPurchase)
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  )
  const [supplierName, setSupplierName] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [invoiceFileReference, setInvoiceFileReference] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function updateItem(index: number, patch: Partial<Item>) {
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      supplierName.trim().length < 2 ||
      items.some((item) => !item.productId || !item.quantity || !item.unitCost)
    ) {
      setMessage(
        'Informe fornecedor, produto, quantidade e custo em todos os itens.',
      )
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await save({
        data: {
          idempotencyKey,
          supplierName,
          purchasedAt,
          invoiceFileReference,
          notes,
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      })
      setSupplierName('')
      setInvoiceFileReference('')
      setNotes('')
      setItems([emptyItem()])
      setIdempotencyKey(crypto.randomUUID())
      setMessage('Compra registrada e estoque atualizado.')
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a compra.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <ManagementLayout
      title="Compras"
      description="Registre compras de ingredientes, embalagens ou produtos. Cada item gera uma entrada correspondente no estoque."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Compras recentes</h2>
          </div>
          {!canReadHistory ? (
            <Empty text="Seu acesso permite registrar compras, sem consultar o histórico financeiro." />
          ) : (
            <>
              <form
                className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] px-5 py-4"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      query:
                        String(form.get('query') ?? '').trim() || undefined,
                      start: String(form.get('start') ?? '') || undefined,
                      end: String(form.get('end') ?? '') || undefined,
                      page: 1,
                    }),
                  })
                }}
              >
                <label className="text-xs font-bold text-[#573524]">
                  Fornecedor
                  <input
                    className="field mt-1 block min-w-48"
                    name="query"
                    defaultValue={search.query}
                    placeholder="Buscar fornecedor"
                  />
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
                {search.query || search.start || search.end ? (
                  <button
                    type="button"
                    className="px-2 py-2 text-xs font-bold text-[#75411f]"
                    onClick={() => void navigate({ search: { page: 1 } })}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </form>
              {history.purchases.length ? (
                <ul className="divide-y divide-[#f0e5dc]">
                  {history.purchases.map((purchase) => (
                    <li
                      key={purchase.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div>
                        <p className="font-bold">{purchase.supplierName}</p>
                        <p className="mt-1 text-xs text-[#896d5b]">
                          {new Intl.DateTimeFormat('pt-BR').format(
                            new Date(`${purchase.purchasedAt}T12:00:00`),
                          )}
                          {purchase.invoiceFileReference
                            ? ' · nota referenciada'
                            : ''}
                        </p>
                      </div>
                      <strong>
                        {currency.format(Number(purchase.totalAmount))}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="Nenhuma compra encontrada para esses filtros." />
              )}
              <nav
                className="flex items-center justify-between gap-3 border-t border-[#f0e5dc] px-5 py-4 text-sm"
                aria-label="Paginação das compras"
              >
                <span aria-live="polite">
                  Página {history.page} de {history.totalPages} ·{' '}
                  {history.total} {history.total === 1 ? 'compra' : 'compras'}
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
          <h2 className="font-bold">Nova compra</h2>
          <Input
            label="Fornecedor *"
            value={supplierName}
            onChange={setSupplierName}
          />
          <Input
            label="Data da compra *"
            value={purchasedAt}
            onChange={setPurchasedAt}
            type="date"
          />
          <Input
            label="Referência futura da nota fiscal"
            value={invoiceFileReference}
            onChange={setInvoiceFileReference}
            placeholder="Nome do arquivo ou link futuro"
          />
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
                    aria-label="Remover item"
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
                      {product.name} ({product.unit})
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Input
                  label="Quantidade"
                  value={item.quantity}
                  onChange={(quantity) => updateItem(index, { quantity })}
                  placeholder="Ex.: 1,500"
                  inputMode="decimal"
                />
                <Input
                  label="Custo unitário"
                  value={item.unitCost}
                  onChange={(unitCost) => updateItem(index, { unitCost })}
                  placeholder="Ex.: 12,50"
                  inputMode="decimal"
                />
              </div>
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
          <label className="block text-sm font-bold text-[#573524]">
            Observações
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="field mt-1.5 min-h-20"
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
            {saving ? 'Registrando...' : 'Registrar compra'}
          </button>
        </form>
      </div>
    </ManagementLayout>
  )
}

function PurchasesPending() {
  return (
    <ManagementLayout
      title="Compras"
      description="Carregando o histórico de compras."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Carregando compras…
      </p>
    </ManagementLayout>
  )
}

function PurchasesError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Compras"
      description="Não foi possível carregar o histórico de compras."
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-1.5"
        {...props}
      />
    </label>
  )
}
function Empty({ text }: { text: string }) {
  return <p className="p-6 text-sm text-[#846859]">{text}</p>
}
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
