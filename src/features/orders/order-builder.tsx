import { Check, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  catalogProducts,
  formatPrice,
  type CatalogProductSlug,
} from '#/features/catalog/catalog'
import { createOrder } from '#/features/orders/functions'

type Quantities = Record<CatalogProductSlug, number>

const emptyQuantities: Quantities = {
  tradicional: 0,
  'doce-de-leite': 0,
  nozes: 0,
}

export function OrderBuilder() {
  const [quantities, setQuantities] = useState<Quantities>(emptyQuantities)
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedItems = useMemo(
    () =>
      catalogProducts.flatMap((product) => {
        const quantity = quantities[product.slug]
        return quantity > 0 ? [{ product, quantity }] : []
      }),
    [quantities],
  )
  const subtotalCents = selectedItems.reduce(
    (total, item) => total + item.product.priceCents * item.quantity,
    0,
  )

  function updateQuantity(productSlug: CatalogProductSlug, amount: number) {
    setConfirmation(null)
    setError(null)
    setQuantities((current) => ({
      ...current,
      [productSlug]: Math.max(0, Math.min(12, current[productSlug] + amount)),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setConfirmation(null)

    if (selectedItems.length === 0) {
      setError('Escolha ao menos um brownie para continuar.')
      return
    }

    const formData = new FormData(event.currentTarget)
    setIsSubmitting(true)

    try {
      const order = await createOrder({
        data: {
          customerName: String(formData.get('customerName') || ''),
          customerPhone: String(formData.get('customerPhone') || ''),
          fulfillment,
          deliveryAddress: String(formData.get('deliveryAddress') || ''),
          notes: String(formData.get('notes') || ''),
          items: selectedItems.map(({ product, quantity }) => ({
            productSlug: product.slug,
            quantity,
          })),
        },
      })

      setConfirmation(
        `Pedido ${order.orderNumber} registrado. Total: ${formatPrice(order.totalCents)}.`,
      )
      setQuantities(emptyQuantities)
      event.currentTarget.reset()
      setFulfillment('pickup')
    } catch {
      setError('Não foi possível registrar agora. Confira os dados e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="encomendar" className="scroll-mt-24 px-4 pb-16 pt-10 sm:pb-24">
      <div className="page-wrap grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          className="rounded-[2rem] bg-[#2a110b] p-6 text-[#fff7ee] shadow-2xl shadow-[#4b1e0e]/20 sm:p-9"
          onSubmit={handleSubmit}
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#f6bf79]">
            Seu pedido
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Qual vai adoçar seu dia?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#e8cabb]">
            Selecione os sabores, conte como prefere receber e envie o pedido
            para a nossa cozinha.
          </p>

          <div className="mt-7 space-y-3">
            {catalogProducts.map((product) => {
              const quantity = quantities[product.slug]

              return (
                <div
                  key={product.slug}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:gap-4 sm:p-4"
                >
                  <div
                    className={`hidden h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br shadow-inner sm:block ${product.accent}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-sm font-bold sm:text-base">{product.name}</h3>
                      <span className="text-sm font-semibold text-[#f6bf79]">
                        {formatPrice(product.priceCents)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#d8b7a7]">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center rounded-full border border-white/15 bg-black/15 p-1">
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#f9dccc] hover:bg-white/10 disabled:opacity-35"
                      type="button"
                      aria-label={`Remover ${product.name}`}
                      disabled={quantity === 0}
                      onClick={() => updateQuantity(product.slug, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e7984d] text-[#2a110b] hover:bg-[#f5b36e] disabled:opacity-35"
                      type="button"
                      aria-label={`Adicionar ${product.name}`}
                      disabled={quantity === 12}
                      onClick={() => updateQuantity(product.slug, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Nome
              <input
                required
                name="customerName"
                autoComplete="name"
                placeholder="Como podemos te chamar?"
                className="order-input"
              />
            </label>
            <label className="text-sm font-semibold">
              WhatsApp
              <input
                required
                name="customerPhone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                className="order-input"
              />
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Como prefere receber?</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(['pickup', 'delivery'] as const).map((method) => (
                <label
                  key={method}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold ${
                    fulfillment === method
                      ? 'border-[#f6bf79] bg-[#f6bf79]/15 text-[#ffe1af]'
                      : 'border-white/15 text-[#d8b7a7]'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="fulfillment"
                    value={method}
                    checked={fulfillment === method}
                    onChange={() => setFulfillment(method)}
                  />
                  {method === 'pickup' ? 'Retirar' : 'Entrega'}
                </label>
              ))}
            </div>
          </fieldset>

          {fulfillment === 'delivery' && (
            <label className="mt-5 block text-sm font-semibold">
              Endereço de entrega
              <textarea
                required
                name="deliveryAddress"
                rows={3}
                placeholder="Rua, número, bairro e referência"
                className="order-input resize-y"
              />
            </label>
          )}
          <label className="mt-5 block text-sm font-semibold">
            Algum recado? <span className="font-normal text-[#caa99a]">(opcional)</span>
            <textarea
              name="notes"
              rows={2}
              placeholder="Ex.: entregar depois das 16h"
              className="order-input resize-y"
            />
          </label>

          {error && (
            <p className="mt-5 rounded-xl bg-[#8c3427] px-4 py-3 text-sm" role="alert">
              {error}
            </p>
          )}
          {confirmation && (
            <p
              className="mt-5 flex items-center gap-2 rounded-xl bg-[#416f45] px-4 py-3 text-sm"
              role="status"
            >
              <Check size={18} />
              {confirmation}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f3a65a] px-5 py-3.5 text-sm font-extrabold text-[#2a110b] transition hover:bg-[#ffc17c] disabled:cursor-wait disabled:opacity-70"
          >
            <ShoppingBag size={18} />
            {isSubmitting ? 'Registrando pedido...' : 'Registrar pedido'}
          </button>
        </form>

        <aside className="h-fit rounded-[2rem] border border-[#e9d8c7] bg-[#fffaf4] p-6 shadow-xl shadow-[#4b1e0e]/5 sm:p-8 lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b5c30]">Resumo</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-[#35170e]">Seu carrinho</h2>
          <div className="mt-6 space-y-3 border-y border-[#eadbce] py-5">
            {selectedItems.length === 0 ? (
              <p className="text-sm leading-6 text-[#805f50]">
                Ainda não tem nenhum brownie por aqui. Escolha seu sabor favorito.
              </p>
            ) : (
              selectedItems.map(({ product, quantity }) => (
                <div key={product.slug} className="flex justify-between gap-4 text-sm">
                  <span className="text-[#5d3829]">
                    <strong>{quantity}×</strong> {product.name}
                  </span>
                  <strong className="text-[#35170e]">
                    {formatPrice(product.priceCents * quantity)}
                  </strong>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 flex items-end justify-between">
            <span className="text-sm font-semibold text-[#805f50]">Subtotal</span>
            <strong className="font-serif text-3xl text-[#35170e]">
              {formatPrice(subtotalCents)}
            </strong>
          </div>
          <p className="mt-5 rounded-xl bg-[#f6eee6] px-4 py-3 text-xs leading-5 text-[#805f50]">
            Taxa e janela de entrega são confirmadas pela equipe conforme o seu
            endereço. O pagamento também é combinado após a confirmação.
          </p>
        </aside>
      </div>
    </section>
  )
}
