import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { ManagementLayout } from '#/components/ManagementLayout'
import { hasPermission } from '#/features/auth/authorization'
import {
  createSale,
  listSaleProducts,
  listSales,
} from '#/features/operations/functions'
import { cancelSaleLifecycle } from '#/features/inventory/lifecycle-writers'
import {
  canCancelSale,
  canSubmitLifecycle,
  lifecycleErrorMessage,
  validateLifecycleForm,
} from '#/features/inventory/lifecycle-ui'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/vendas')({
  loader: async ({ context }) => {
    const canReadHistory = Boolean(
      context.appRole && hasPermission(context.appRole, 'sales:read'),
    )
    const canManageLifecycle = Boolean(
      context.appRole && hasPermission(context.appRole, 'fifo:lifecycle:write'),
    )
    return {
      products: await listSaleProducts(),
      sales: canReadHistory ? await listSales() : [],
      canReadHistory,
      canManageLifecycle,
    }
  },
  component: SalesPage,
})
type Item = { productId: string; quantity: string }
const emptyItem = (): Item => ({ productId: '', quantity: '' })
const statusLabels = {
  draft: 'Rascunho',
  confirmed: 'Confirmada',
  paid: 'Paga',
  cancelled: 'Cancelada',
}

function SalesPage() {
  const { products, sales, canReadHistory, canManageLifecycle } =
    Route.useLoaderData()
  const router = useRouter()
  const save = useServerFn(createSale)
  const cancel = useServerFn(cancelSaleLifecycle)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [status, setStatus] = useState<
    'draft' | 'confirmed' | 'paid' | 'cancelled'
  >('draft')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
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
    if (items.some((item) => !item.productId || !item.quantity)) {
      setMessage(
        'Selecione o produto e informe a quantidade em todos os itens.',
      )
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await save({
        data: {
          customerName,
          customerPhone,
          status,
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
      setItems([emptyItem()])
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
          ) : sales.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {sales.map((sale) => (
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
                      {formatDateTime(sale.soldAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <strong>{currency.format(Number(sale.totalAmount))}</strong>
                    {canManageLifecycle && canCancelSale(sale.status) ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setCancellingId(sale.id)
                          setCancelReason('')
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
                      <label className="mt-2 flex gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={cancelConfirmed}
                          onChange={(event) =>
                            setCancelConfirmed(event.target.checked)
                          }
                        />{' '}
                        Confirmo o estorno de estoque e CMV.
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={
                            !canSubmitLifecycle(saving, true, cancelConfirmed)
                          }
                          onClick={() => submitCancellation(sale.id)}
                          className="rounded bg-[#a64f23] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          {saving ? 'Estornando...' : 'Confirmar cancelamento'}
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
              Nenhuma venda registrada ainda.
            </p>
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
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
              className="field mt-1.5"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
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
