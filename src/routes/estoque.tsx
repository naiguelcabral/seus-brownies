import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { ManagementLayout } from '#/components/ManagementLayout'
import { listInventory } from '#/features/operations/functions'
import { recordLossLifecycle, recordNegativeAdjustmentLifecycle, recordPositiveAdjustmentLifecycle, returnSaleLifecycle } from '#/features/inventory/lifecycle-writers'
import { canSubmitLifecycle, lifecycleErrorMessage, validateLifecycleForm } from '#/features/inventory/lifecycle-ui'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/estoque')({
  loader: () => listInventory(),
  component: InventoryPage,
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
  const { balances, movements } = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [clientReady, setClientReady] = useState(false)
  useEffect(() => { setClientReady(true) }, [])
  const filtered = useMemo(
    () =>
      balances.filter(
        (item) =>
          (type === 'all' || item.type === type) &&
          `${item.name} ${item.sku}`
            .toLocaleLowerCase('pt-BR')
            .includes(search.toLocaleLowerCase('pt-BR')),
      ),
    [balances, search, type],
  )
  return (
    <ManagementLayout
      title="Estoque"
      description="O saldo é calculado pela soma das movimentações. Compras entram; vendas confirmadas ou pagas saem."
    >
      {clientReady ? <span data-testid="fifo-lifecycle-client-ready" className="sr-only">Interface pronta</span> : null}
      <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field flex-1"
            placeholder="Filtrar por nome ou SKU"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="field sm:w-52"
          >
            <option value="all">Todos os tipos</option>
            <option value="ingredient">Ingredientes</option>
            <option value="packaging">Embalagens</option>
            <option value="finished_product">Produtos finais</option>
          </select>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-[#f0e5dc] bg-[#fffaf5] text-xs uppercase text-[#896d5b]">
              <tr>
                <th className="px-3 py-3">Produto</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3 text-right">Saldo calculado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e5dc]">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <strong>{item.name}</strong>
                    <span className="ml-2 text-xs text-[#896d5b]">
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-3 py-3">{typeLabel(item.type)}</td>
                  <td className="px-3 py-3">{item.categoryName ?? '—'}</td>
                  <td
                    className={`px-3 py-3 text-right font-bold ${Number(item.balance) <= 0 ? 'text-[#b65624]' : ''}`}
                  >
                    {formatQuantity(item.balance, item.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#846859]">
              Nenhum produto encontrado.
            </p>
          ) : null}
        </div>
      </section>
      <LifecycleActions products={balances} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
        <div className="border-b border-[#f0e5dc] px-5 py-4">
          <h2 className="font-bold">Histórico de movimentações</h2>
        </div>
        {movements.length ? (
          <ul className="divide-y divide-[#f0e5dc]">
            {movements.map((movement) => (
              <li
                key={movement.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="font-bold">{movement.productName}</p>
                  <p className="text-xs text-[#896d5b]">
                    {movementLabels[movement.type]} · {formatDateTime(movement.occurredAt)}
                  </p>
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
            O histórico aparecerá após a primeira compra, venda ou ajuste.
          </p>
        )}
      </section>
    </ManagementLayout>
  )
}

function LifecycleActions({ products }: { products: Array<{ id: number; name: string; sku: string }> }) {
  const router = useRouter()
  const recordReturn = useServerFn(returnSaleLifecycle)
  const recordLoss = useServerFn(recordLossLifecycle)
  const recordNegative = useServerFn(recordNegativeAdjustmentLifecycle)
  const recordPositive = useServerFn(recordPositiveAdjustmentLifecycle)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [returnValues, setReturnValues] = useState({ saleItemId: '', quantity: '', reason: '', reference: '' })
  const [negativeValues, setNegativeValues] = useState({ productId: '', quantity: '', reason: '', reference: '' })
  const [positiveValues, setPositiveValues] = useState({ productId: '', quantity: '', reason: '', reference: '', totalCost: '', originReference: '' })
  async function run(kind: 'return' | 'loss' | 'negative' | 'positive', values: Record<string, string>, confirmed = false) {
    const numeric = { ...values, ...(kind === 'return' ? { saleItemId: Number(values.saleItemId) } : { productId: Number(values.productId) }) }
    const validation = validateLifecycleForm(kind, numeric)
    if (!validation.ok) { setMessage(validation.message); return }
    if ((kind === 'loss' || kind === 'negative') && !confirmed) { setMessage('Confirme a saída de estoque antes de continuar.'); return }
    setPending(true); setMessage(null)
    try {
      if (kind === 'return') await recordReturn({ data: validation.data })
      if (kind === 'loss') await recordLoss({ data: validation.data })
      if (kind === 'negative') await recordNegative({ data: validation.data })
      if (kind === 'positive') await recordPositive({ data: validation.data })
      setMessage('Evento FIFO registrado.'); await router.invalidate()
    } catch (error) { setMessage(lifecycleErrorMessage(error)) } finally { setPending(false) }
  }
  const product = (value: string, change: (value: string) => void) => <label className="block text-xs font-bold">Produto<select className="field mt-1" value={value} onChange={(event) => change(event.target.value)}><option value="">Selecione</option>{products.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.sku}</option>)}</select></label>
  const field = (label: string, value: string, change: (value: string) => void, placeholder = '') => <label className="block text-xs font-bold">{label}<input className="field mt-1" value={value} placeholder={placeholder} onChange={(event) => change(event.target.value)} /></label>
  return <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5"><h2 className="font-bold">Eventos FIFO de ciclo de vida</h2><p className="mt-1 text-xs text-[#896d5b]">As ações abaixo exigem a migration 0013 e são registradas pelo servidor em uma única transação.</p>{message ? <p className="mt-3 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]">{message}</p> : null}
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <form className="rounded-xl border border-[#ead9ca] p-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void run('return', returnValues) }}><strong>Devolução de venda</strong>{field('ID do item da venda', returnValues.saleItemId, (value) => setReturnValues({ ...returnValues, saleItemId: value }))}{field('Quantidade', returnValues.quantity, (value) => setReturnValues({ ...returnValues, quantity: value }), '1,000')}{field('Motivo', returnValues.reason, (value) => setReturnValues({ ...returnValues, reason: value }))}{field('Referência', returnValues.reference, (value) => setReturnValues({ ...returnValues, reference: value }))}<button disabled={pending} className="action-button">Registrar devolução</button></form>
      <NegativeForm title="Perda de estoque" values={negativeValues} setValues={setNegativeValues} product={product} field={field} pending={pending} onSubmit={(confirmed) => run('loss', negativeValues, confirmed)} />
      <NegativeForm title="Ajuste negativo" values={negativeValues} setValues={setNegativeValues} product={product} field={field} pending={pending} onSubmit={(confirmed) => run('negative', negativeValues, confirmed)} />
      <form className="rounded-xl border border-[#ead9ca] p-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void run('positive', positiveValues) }}><strong>Ajuste positivo</strong>{product(positiveValues.productId, (value) => setPositiveValues({ ...positiveValues, productId: value }))}{field('Quantidade', positiveValues.quantity, (value) => setPositiveValues({ ...positiveValues, quantity: value }), '1,000')}{field('Custo total', positiveValues.totalCost, (value) => setPositiveValues({ ...positiveValues, totalCost: value }), '0,00')}{field('Origem do custo', positiveValues.originReference, (value) => setPositiveValues({ ...positiveValues, originReference: value }))}{field('Motivo', positiveValues.reason, (value) => setPositiveValues({ ...positiveValues, reason: value }))}{field('Referência', positiveValues.reference, (value) => setPositiveValues({ ...positiveValues, reference: value }))}<button disabled={pending} className="action-button">Registrar ajuste positivo</button></form>
    </div></section>
}

function NegativeForm({ title, values, setValues, product, field, pending, onSubmit }: { title: string; values: { productId: string; quantity: string; reason: string; reference: string }; setValues: (values: { productId: string; quantity: string; reason: string; reference: string }) => void; product: (value: string, change: (value: string) => void) => React.ReactNode; field: (label: string, value: string, change: (value: string) => void, placeholder?: string) => React.ReactNode; pending: boolean; onSubmit: (confirmed: boolean) => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false)
  return <form className="rounded-xl border border-[#ead9ca] p-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void onSubmit(confirmed) }}><strong>{title}</strong>{product(values.productId, (value) => setValues({ ...values, productId: value }))}{field('Quantidade', values.quantity, (value) => setValues({ ...values, quantity: value }), '1,000')}{field('Motivo', values.reason, (value) => setValues({ ...values, reason: value }))}{field('Referência', values.reference, (value) => setValues({ ...values, reference: value }))}<label className="flex gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Confirmo a saída de estoque.</label><button disabled={!canSubmitLifecycle(pending, true, confirmed)} className="action-button">Registrar {title.toLocaleLowerCase('pt-BR')}</button></form>
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
