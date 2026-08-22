import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { ManagementLayout } from '#/components/ManagementLayout'
import {
  createPurchase,
  listPurchasableProducts,
  listPurchases,
} from '#/features/operations/functions'

export const Route = createFileRoute('/compras')({
  loader: async () => ({
    products: await listPurchasableProducts(),
    purchases: await listPurchases(),
  }),
  component: PurchasesPage,
})

type Item = { productId: string; quantity: string; unitCost: string }
const emptyItem = (): Item => ({ productId: '', quantity: '', unitCost: '' })

function PurchasesPage() {
  const { products, purchases } = Route.useLoaderData()
  const router = useRouter()
  const save = useServerFn(createPurchase)
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
          {purchases.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {purchases.map((purchase) => (
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
            <Empty text="Nenhuma compra registrada ainda." />
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
