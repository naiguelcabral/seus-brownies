import { useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { OperationDialog } from './OperationDialog'
import {
  createProduct,
  listCategories,
  listProducts,
} from '#/features/catalog/functions'
import { createPurchase } from '#/features/operations/functions'
import {
  batchMoneyCents,
  decodePurchaseBatchFragment,
  maxPurchaseBatchBytes,
  parsePurchaseBatch,
  preparePurchaseBatch,
  purchaseBatchTotal,
  runPurchaseBatch,
} from '#/features/operations/purchase-batch'
import type {
  PurchaseBatch,
  PurchaseBatchPorts,
} from '#/features/operations/purchase-batch'

function money(cents: bigint) {
  return `R$ ${(cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(cents % 100n).padStart(2, '0')}`
}

export function PurchaseBatchImporter({
  disabled,
  canCreateProducts,
}: {
  disabled: boolean
  canCreateProducts: boolean
}) {
  const router = useRouter()
  const find = useServerFn(listProducts)
  const categories = useServerFn(listCategories)
  const create = useServerFn(createProduct)
  const save = useServerFn(createPurchase)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [batch, setBatch] = useState<PurchaseBatch | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<
    { index: number; id: number; replayed: boolean }[]
  >([])
  const [complete, setComplete] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const busy = useRef(false)
  const ports: PurchaseBatchPorts = {
    findProducts: async (sku) =>
      (await find({ data: { query: sku, page: 1 } })).products,
    listCategories: categories,
    createProduct: (data) => create({ data }),
    createPurchase: (data) => save({ data }),
  }

  function changeText(value: string) {
    setText(value)
    setBatch(null)
    setMissing([])
    setError(null)
    setResults([])
    setComplete(false)
    setRefreshFailed(false)
  }
  function show() {
    setOpen(true)
    try {
      const linked = decodePurchaseBatchFragment(window.location.hash)
      if (linked) {
        changeText(linked)
        // The fragment is never sent to the server. Remove it from the address
        // bar after loading; no localStorage, logs, or server-side staging.
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search,
        )
      }
    } catch {
      setError(
        'Não foi possível abrir o lote do link. Use o arquivo preparado.',
      )
    }
  }
  async function check() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const parsed = parsePurchaseBatch(text, window.location.origin)
      const preview = await preparePurchaseBatch(parsed, ports)
      if (preview.missing.length && !canCreateProducts) {
        throw new Error(
          'Este lote inclui novos produtos. Solicite a inclusão a um gerente ou ao dono.',
        )
      }
      setBatch(parsed)
      setMissing(preview.missing.map((product) => product.name))
    } catch (cause) {
      setBatch(null)
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível conferir o lote.',
      )
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  async function submit() {
    if (busy.current || !batch || complete) return
    busy.current = true
    setPending(true)
    setError(null)
    setResults([])
    try {
      await runPurchaseBatch(batch, ports, (result) =>
        setResults((previous) => [...previous, result]),
      )
      setComplete(true)
      try {
        await router.invalidate()
      } catch {
        setRefreshFailed(true)
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'A inclusão foi interrompida.',
      )
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={show}
        className="mb-4 ml-2 rounded-lg border border-[#4a2114] px-4 py-2.5 font-bold text-[#4a2114]"
      >
        Importar lote de compras
      </button>
      {open ? (
        <OperationDialog
          title="Importar lote de compras"
          pending={pending}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4 p-4">
            <p className="text-sm">
              Carregue o lote preparado e confira produtos, quantidades e
              valores antes de confirmar. Cada compra é registrada separadamente
              e atualiza o estoque.
            </p>
            {!batch ? (
              <>
                <label className="block text-sm font-bold">
                  Arquivo do lote
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="mt-2 block w-full text-sm"
                    onChange={async (event) => {
                      const file = event.currentTarget.files?.[0]
                      if (!file || busy.current) return
                      changeText('')
                      if (file.size > maxPurchaseBatchBytes) {
                        setError('O lote excede o limite de 64 KB.')
                        return
                      }
                      busy.current = true
                      setPending(true)
                      try {
                        changeText(await file.text())
                      } catch {
                        setError('Não foi possível ler o arquivo.')
                      } finally {
                        busy.current = false
                        setPending(false)
                      }
                    }}
                  />
                </label>
                <details>
                  <summary className="cursor-pointer text-sm font-bold">
                    Ou cole os dados do lote
                  </summary>
                  <label className="mt-2 block text-sm">
                    Dados do lote
                    <textarea
                      className="field mt-1 block min-h-32 w-full font-mono text-xs"
                      value={text}
                      maxLength={maxPurchaseBatchBytes}
                      onChange={(event) => changeText(event.target.value)}
                    />
                  </label>
                </details>
                {text ? (
                  <p className="text-sm">
                    Lote carregado. Toque em conferir para ver os itens.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={pending || !text}
                  onClick={() => void check()}
                  className="rounded-lg bg-[#4a2114] px-4 py-2.5 font-bold text-white"
                >
                  Conferir lote
                </button>
              </>
            ) : (
              <>
                <section aria-label="Conferência do lote" className="space-y-4">
                  {batch.purchases.map((purchase) => (
                    <article
                      key={purchase.idempotencyKey}
                      className="rounded-lg border border-[#ecdfd4] p-3"
                    >
                      <h3 className="font-bold">
                        {purchase.purchasedAt.split('-').reverse().join('/')} ·{' '}
                        {purchase.supplierName}
                      </h3>
                      <p className="break-all text-xs text-[#896d5b]">
                        {purchase.invoiceFileReference}
                      </p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {purchase.items.map((item, index) => {
                          const product = batch.products.find(
                            (candidate) => candidate.key === item.productKey,
                          )
                          return (
                            <li
                              key={index}
                              className="flex flex-wrap justify-between gap-2"
                            >
                              <span>
                                {product?.name} ·{' '}
                                {item.quantity.replace('.', ',')}{' '}
                                {item.purchaseUnit ??
                                  (product?.unit === 'unit'
                                    ? 'un.'
                                    : product?.unit)}
                              </span>
                              <strong>
                                {money(batchMoneyCents(item.totalAmount))}
                              </strong>
                            </li>
                          )
                        })}
                      </ul>
                      <p className="mt-2 font-bold">
                        Subtotal:{' '}
                        {money(
                          purchase.items.reduce(
                            (sum, item) =>
                              sum + batchMoneyCents(item.totalAmount),
                            0n,
                          ),
                        )}
                      </p>
                    </article>
                  ))}
                  <p className="font-bold">
                    {batch.purchases.length} compras · Total:{' '}
                    {money(purchaseBatchTotal(batch))}
                  </p>
                  {missing.length ? (
                    <p className="text-sm">
                      Novos produtos a cadastrar: {missing.join(', ')}.
                    </p>
                  ) : null}
                </section>
                {!complete ? (
                  <>
                    <p className="text-sm">
                      Se a conexão cair, reabra este mesmo lote para retomar. As
                      compras já registradas serão reconhecidas, sem nova
                      entrada.
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void submit()}
                      className="rounded-lg bg-[#4a2114] px-4 py-2.5 font-bold text-white"
                    >
                      {pending
                        ? 'Incluindo compras…'
                        : error
                          ? 'Retomar este lote'
                          : 'Confirmar e incluir compras'}
                    </button>
                  </>
                ) : (
                  <p
                    role="status"
                    className="rounded-lg bg-[#eef8ef] p-3 font-bold"
                  >
                    Lote concluído. Compras conferidas e estoque atualizado.
                    {refreshFailed
                      ? ' Recarregue a página para atualizar o histórico.'
                      : ''}
                  </p>
                )}
                {results.length ? (
                  <ul
                    aria-label="Resultado da inclusão"
                    className="space-y-1 text-sm"
                  >
                    {results.map((result) => (
                      <li key={result.index}>
                        Compra {result.index + 1}: #{result.id}{' '}
                        {result.replayed
                          ? 'já registrada; sem duplicação'
                          : 'registrada'}
                        .
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}
          </div>
        </OperationDialog>
      ) : null}
    </>
  )
}
