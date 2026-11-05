import { useId, useRef, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { OperationDialog } from './OperationDialog'
import { checkPositiveAdjustmentBatch } from '#/features/inventory/positive-adjustment-batch.functions'
import { recordPositiveAdjustmentLifecycle } from '#/features/inventory/lifecycle-writers'
import {
  adjustmentMoneyCents,
  decodeAdjustmentBatchFragment,
  maxAdjustmentBatchBytes,
  parsePositiveAdjustmentBatch,
  runPositiveAdjustmentBatch,
} from '#/features/inventory/positive-adjustment-batch'
import type {
  AdjustmentBatchPreview,
  AdjustmentBatchResult,
  PositiveAdjustmentBatch,
} from '#/features/inventory/positive-adjustment-batch'

function money(cents: bigint) {
  return `R$ ${(cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(cents % 100n).padStart(2, '0')}`
}

export function PositiveAdjustmentBatchImporter() {
  const router = useRouter()
  const id = useId()
  const check = useServerFn(checkPositiveAdjustmentBatch)
  const record = useServerFn(recordPositiveAdjustmentLifecycle)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [batch, setBatch] = useState<PositiveAdjustmentBatch | null>(null)
  const [preview, setPreview] = useState<AdjustmentBatchPreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AdjustmentBatchResult[]>([])
  const [complete, setComplete] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const busy = useRef(false)
  const ports = {
    preview: (data: PositiveAdjustmentBatch) => check({ data }),
    record: (data: Parameters<typeof record>[0]['data']) => record({ data }),
  }

  function changeText(value: string) {
    setText(value)
    setBatch(null)
    setPreview(null)
    setConfirmed(false)
    setError(null)
    setResults([])
    setComplete(false)
    setRefreshFailed(false)
  }
  function show() {
    setOpen(true)
    try {
      const linked = decodeAdjustmentBatchFragment(window.location.hash)
      if (linked) {
        changeText(linked)
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search,
        )
      }
    } catch {
      setError(
        'Não foi possível abrir os ajustes do link. Cole os dados preparados.',
      )
    }
  }
  async function previewBatch() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const parsed = parsePositiveAdjustmentBatch(text, window.location.origin)
      const checked = await ports.preview(parsed)
      setBatch(parsed)
      setPreview(checked)
      setConfirmed(false)
    } catch (cause) {
      setBatch(null)
      setPreview(null)
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível conferir os ajustes.',
      )
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  async function submit() {
    if (busy.current || !batch || !confirmed || complete) return
    busy.current = true
    setPending(true)
    setError(null)
    setResults([])
    try {
      await runPositiveAdjustmentBatch(batch, ports, (result) =>
        setResults((previous) => [...previous, result]),
      )
      setComplete(true)
      try {
        await router.invalidate({ sync: true })
      } catch {
        setRefreshFailed(true)
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'A inclusão foi interrompida. Reabra este mesmo lote para conferir e retomar.',
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
        onClick={show}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d9c3b4] bg-white px-3 py-2 font-sans text-sm font-bold text-[#725443] transition hover:bg-[#f5e9df]"
      >
        <ClipboardCheck size={16} aria-hidden="true" className="shrink-0" />
        Conferir lote de ajustes positivos
      </button>
      {open ? (
        <OperationDialog
          title="Conferir ajustes positivos"
          pending={pending}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4 p-4">
            <p className="text-sm">
              Confira produtos, quantidades, custos e origens antes de
              confirmar. Cada ajuste aumenta o estoque e registra sua autoria.
              Não registra compra nem conclui produção.
            </p>
            {!batch ? (
              <>
                <label className="block text-sm font-bold">
                  Arquivo dos ajustes
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="mt-2 block w-full text-sm"
                    onChange={async (event) => {
                      const file = event.currentTarget.files?.[0]
                      if (!file || busy.current) return
                      changeText('')
                      if (file.size > maxAdjustmentBatchBytes) {
                        setError('O lote excede o limite de 32 KB.')
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
                <label htmlFor={id} className="block text-sm font-bold">
                  Dados dos ajustes
                </label>
                <textarea
                  id={id}
                  className="field block min-h-32 w-full font-mono text-xs"
                  maxLength={maxAdjustmentBatchBytes}
                  value={text}
                  onChange={(event) => changeText(event.target.value)}
                />
                <button
                  type="button"
                  disabled={pending || !text}
                  onClick={() => void previewBatch()}
                  className="rounded-lg bg-[#4a2114] px-4 py-2.5 font-bold text-white"
                >
                  Conferir ajustes
                </button>
              </>
            ) : (
              <>
                <section
                  aria-label="Conferência dos ajustes"
                  className="space-y-3"
                >
                  {batch.adjustments.map((item, index) => (
                    <article
                      key={item.reference}
                      className="rounded-lg border border-[#ecdfd4] p-3 text-sm"
                    >
                      <h3 className="font-bold">
                        {item.name} · {item.quantity.replace('.', ',')}{' '}
                        {item.unit === 'unit' ? 'un.' : item.unit}
                      </h3>
                      <p>
                        Custo total:{' '}
                        <strong>
                          {money(adjustmentMoneyCents(item.totalCost))}
                        </strong>
                      </p>
                      <p className="break-all">Referência: {item.reference}</p>
                      <p className="break-all">
                        Origem: {item.originReference}
                      </p>
                      <p>{item.reason}</p>
                      {results.some((result) => result.index === index) ? (
                        <p>Registrado; movimento na lista de resultados.</p>
                      ) : preview?.items[index]?.movementId != null ? (
                        <p>Já registrado; será preservado sem nova entrada.</p>
                      ) : (
                        <p>Ajuste pendente.</p>
                      )}
                    </article>
                  ))}
                  <p className="font-bold">
                    {batch.adjustments.length} ajustes · Total:{' '}
                    {money(
                      batch.adjustments.reduce(
                        (sum, item) =>
                          sum + adjustmentMoneyCents(item.totalCost),
                        0n,
                      ),
                    )}
                  </p>
                </section>
                {!complete ? (
                  <>
                    <label className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      Conferi os itens e autorizo os ajustes positivos neste
                      ambiente.
                    </label>
                    <p className="text-sm">
                      Em caso de interrupção, retome este mesmo lote. As
                      referências já registradas serão conferidas antes de
                      qualquer nova inclusão.
                    </p>
                    <button
                      type="button"
                      disabled={pending || !confirmed}
                      onClick={() => void submit()}
                      className="rounded-lg bg-[#4a2114] px-4 py-2.5 font-bold text-white"
                    >
                      {pending
                        ? 'Incluindo ajustes…'
                        : error
                          ? 'Conferir e retomar este lote'
                          : 'Confirmar e incluir ajustes'}
                    </button>
                  </>
                ) : (
                  <p
                    role="status"
                    className="rounded-lg bg-green-50 p-3 font-bold"
                  >
                    Ajustes concluídos. Estoque atualizado.
                    {refreshFailed
                      ? ' Recarregue a página para atualizar o histórico.'
                      : ''}
                  </p>
                )}
                {results.length ? (
                  <ul
                    aria-label="Resultado dos ajustes"
                    className="space-y-1 text-sm"
                  >
                    {results.map((result) => (
                      <li key={result.index}>
                        Ajuste {result.index + 1}: movimento #
                        {result.movementId}{' '}
                        {result.replayed
                          ? 'já registrado; sem duplicação'
                          : 'registrado'}
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
