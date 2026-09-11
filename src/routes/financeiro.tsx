import { useState } from 'react'
import {
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { hasPermission } from '#/features/auth/authorization'
import {
  closeFinancialPeriod,
  correctFinancialEvent,
  getFinancialOverview,
} from '#/features/finance/functions'
import { formatBrlMoney } from '#/lib/format-money'

const rootRoute = getRouteApi('__root__')
const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/
const searchValues = z.object({
  period: z.string().regex(monthPattern).optional().catch(undefined),
})

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')!.value
  const month = parts.find((part) => part.type === 'month')!.value
  return `${year}-${month}`
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export const Route = createFileRoute('/financeiro')({
  validateSearch: searchValues,
  loaderDeps: ({ search }) => ({ period: search.period ?? currentMonth() }),
  loader: ({ deps }) =>
    getFinancialOverview({ data: { periodMonth: `${deps.period}-01` } }),
  component: FinancialPage,
  pendingComponent: FinancialPending,
  pendingMs: 300,
  errorComponent: FinancialError,
})

const eventLabels = {
  sale_revenue: 'Receita na entrega',
  cash_receipt: 'Recebimento',
  cash_refund: 'Reembolso',
  store_credit_issued: 'Crédito emitido',
  store_credit_redeemed: 'Crédito usado',
  revenue_correction: 'Correção de receita',
  cash_correction: 'Correção de caixa',
} as const

function FinancialPage() {
  const overview = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const { appRole } = rootRoute.useRouteContext()
  const closePeriod = useServerFn(closeFinancialPeriod)
  const correctEvent = useServerFn(correctFinancialEvent)
  const [closeNotes, setCloseNotes] = useState('')
  const [closeConfirmed, setCloseConfirmed] = useState(false)
  const [correctingId, setCorrectingId] = useState<number | null>(null)
  const [correction, setCorrection] = useState({
    effect: 'revenue' as 'revenue' | 'cash',
    deltaAmount: '',
    occurredOn: today(),
    reason: '',
    reference: '',
  })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const canClose = Boolean(
    appRole && hasPermission(appRole, 'financial:period:close'),
  )
  const canCorrect = Boolean(
    appRole && hasPermission(appRole, 'financial:period:correct'),
  )
  const selectedPeriod = search.period ?? currentMonth()

  async function submitClose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!closeConfirmed) {
      setMessage('Confirme o congelamento do período antes de continuar.')
      return
    }
    setPending(true)
    setMessage(null)
    try {
      await closePeriod({
        data: {
          periodMonth: `${selectedPeriod}-01`,
          notes: closeNotes,
        },
      })
      setMessage('Período fechado e snapshot auditável registrado.')
      setCloseNotes('')
      setCloseConfirmed(false)
      await router.invalidate({ sync: true })
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível fechar o período.',
      )
    } finally {
      setPending(false)
    }
  }

  async function submitCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!correctingId) return
    setPending(true)
    setMessage(null)
    try {
      await correctEvent({
        data: { correctsEventId: correctingId, ...correction },
      })
      setMessage('Correção imutável registrada no período original.')
      setCorrectingId(null)
      setCorrection({
        effect: 'revenue',
        deltaAmount: '',
        occurredOn: today(),
        reason: '',
        reference: '',
      })
      await router.invalidate({ sync: true })
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a correção.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <ManagementLayout
      title="Financeiro por competência"
      description="Receita na entrega, caixa e correções aparecem separados e podem ser rastreados até cada fato original."
    >
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#ecdfd4] bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void navigate({ search: { period: String(form.get('period')) } })
        }}
      >
        <label className="text-sm font-bold">
          Mês de competência
          <input
            className="field mt-1.5 block"
            type="month"
            name="period"
            defaultValue={selectedPeriod}
            required
          />
        </label>
        <button className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white">
          Consultar
        </button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Receita líquida"
          value={formatBrlMoney(overview.currentSnapshot.netRevenue)}
        />
        <Metric
          label="Fluxo de caixa"
          value={formatBrlMoney(overview.currentSnapshot.cashFlow)}
        />
        <Metric
          label="Fatos no período"
          value={String(overview.currentSnapshot.eventCount)}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Fechamento manual</h2>
            <p className="mt-1 text-sm text-[#846859]">
              Situação:{' '}
              {overview.period?.status === 'closed' ? 'fechado' : 'aberto'}
              {overview.period?.closedAt
                ? ` · fechado em ${new Date(overview.period.closedAt).toLocaleString('pt-BR')}`
                : ''}
            </p>
          </div>
          {overview.period?.status === 'closed' ? (
            <span className="rounded-full bg-[#f3e6d7] px-3 py-1 text-xs font-bold">
              versão {overview.period.version}
            </span>
          ) : null}
        </div>
        {canClose && overview.period?.status !== 'closed' ? (
          <form className="mt-4" onSubmit={submitClose}>
            <label className="text-sm font-bold">
              Nota de conferência
              <textarea
                className="field mt-1.5 min-h-24"
                value={closeNotes}
                onChange={(event) => setCloseNotes(event.target.value)}
                minLength={3}
                maxLength={500}
                required
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={closeConfirmed}
                onChange={(event) => setCloseConfirmed(event.target.checked)}
              />
              Confirmo que revisei os fatos e quero congelar este período.
            </label>
            <button
              className="mt-3 rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              disabled={pending || !closeConfirmed}
            >
              {pending ? 'Fechando…' : 'Fechar período'}
            </button>
          </form>
        ) : null}
      </section>

      {message ? (
        <p
          className="mt-5 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
        <div className="border-b border-[#ecdfd4] p-5">
          <h2 className="font-bold">Fatos financeiros rastreáveis</h2>
          <p className="mt-1 text-sm text-[#846859]">
            Mostrando até 100 fatos, do mais recente para o mais antigo.
          </p>
        </div>
        {overview.events.length ? (
          <ul className="divide-y divide-[#f0e5dc]">
            {overview.events.map((event) => (
              <li key={event.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <strong>{eventLabels[event.type]}</strong>
                    <p className="mt-1 text-sm text-[#846859]">
                      Competência {event.competenceDate} · ocorreu em{' '}
                      {new Date(event.occurredAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="mt-1 text-sm">{event.reason}</p>
                    <p className="mt-1 text-xs text-[#896d5b]">
                      Fato #{event.id}
                      {event.saleId ? ` · venda #${event.saleId}` : ''}
                      {event.correctsEventId
                        ? ` · corrige fato #${event.correctsEventId}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <strong className="block">
                      {formatBrlMoney(event.amount)}
                    </strong>
                    <span className="block text-[#846859]">
                      Receita {formatBrlMoney(event.revenueEffect)}
                    </span>
                    <span className="block text-[#846859]">
                      Caixa {formatBrlMoney(event.cashEffect)}
                    </span>
                    {canCorrect ? (
                      <button
                        type="button"
                        className="mt-2 text-xs font-bold text-[#a64f23]"
                        onClick={() => setCorrectingId(event.id)}
                      >
                        Corrigir fato
                      </button>
                    ) : null}
                  </div>
                </div>
                {correctingId === event.id ? (
                  <form
                    className="mt-4 rounded-xl bg-[#fff8f0] p-4"
                    onSubmit={submitCorrection}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold">
                        Visão corrigida
                        <select
                          className="field mt-1.5"
                          value={correction.effect}
                          onChange={(input) =>
                            setCorrection((current) => ({
                              ...current,
                              effect: input.target.value as 'revenue' | 'cash',
                            }))
                          }
                        >
                          <option value="revenue">Receita</option>
                          <option value="cash">Caixa</option>
                        </select>
                      </label>
                      <Field
                        label="Ajuste (+ ou − R$)"
                        value={correction.deltaAmount}
                        onChange={(deltaAmount) =>
                          setCorrection((current) => ({
                            ...current,
                            deltaAmount,
                          }))
                        }
                      />
                      <Field
                        label="Data em que a correção ocorreu"
                        type="date"
                        value={correction.occurredOn}
                        onChange={(occurredOn) =>
                          setCorrection((current) => ({
                            ...current,
                            occurredOn,
                          }))
                        }
                      />
                      <Field
                        label="Referência idempotente"
                        value={correction.reference}
                        onChange={(reference) =>
                          setCorrection((current) => ({
                            ...current,
                            reference,
                          }))
                        }
                      />
                    </div>
                    <label className="mt-3 block text-sm font-bold">
                      Motivo da correção
                      <textarea
                        className="field mt-1.5 min-h-20"
                        value={correction.reason}
                        onChange={(input) =>
                          setCorrection((current) => ({
                            ...current,
                            reason: input.target.value,
                          }))
                        }
                        minLength={3}
                        maxLength={500}
                        required
                      />
                    </label>
                    <div className="mt-3 flex gap-3">
                      <button
                        className="rounded-lg bg-[#4a2114] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                        disabled={pending}
                      >
                        {pending ? 'Registrando…' : 'Registrar correção'}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold"
                        disabled={pending}
                        onClick={() => setCorrectingId(null)}
                      >
                        Fechar
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-[#846859]">
            Nenhum fato financeiro neste período.
          </p>
        )}
        {overview.eventsLimited ? (
          <p className="border-t border-[#ecdfd4] p-4 text-xs text-[#846859]">
            Há mais fatos no período; refine a investigação diretamente pelos
            registros de origem.
          </p>
        ) : null}
      </section>
    </ManagementLayout>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#a75b33]">
        {label}
      </span>
      <strong className="mt-2 block text-2xl">{value}</strong>
    </article>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        className="field mt-1.5"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function FinancialPending() {
  return (
    <ManagementLayout
      title="Financeiro"
      description="Carregando fatos financeiros."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm"
      >
        Carregando período…
      </p>
    </ManagementLayout>
  )
}

function FinancialError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Financeiro"
      description="Não foi possível carregar o período."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>{error.message || 'Tente novamente em alguns instantes.'}</p>
        <button
          className="mt-3 rounded-lg border border-[#75411f] px-3 py-2 text-xs font-bold"
          onClick={() => void router.invalidate()}
        >
          Tentar novamente
        </button>
      </div>
    </ManagementLayout>
  )
}
