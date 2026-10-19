import {
  expenseClassificationLabels,
  expenseClassification,
} from '#/features/finance/managerial-profit'
import { OperationDialog } from '#/components/OperationDialog'
import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { createExpense, listExpenses } from '#/features/operations/functions'

const expenseSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  start: z.string().date().optional().catch(undefined),
  end: z.string().date().optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/despesas')({
  validateSearch: expenseSearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    start: search.start,
    end: search.end,
    page: search.page,
  }),
  loader: ({ deps }) => listExpenses({ data: deps }),
  component: ExpensesPage,
  pendingComponent: ExpensesPending,
  pendingMs: 300,
  errorComponent: ExpensesError,
})
function ExpensesPage() {
  const history = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: Route.fullPath })
  const save = useServerFn(createExpense)
  const [editorOpen, setEditorOpen] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  )
  const [description, setDescription] = useState('')
  const [classification, setClassification] = useState<
    'fixed' | 'variable' | 'production'
  >('fixed')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      description.trim().length < 2 ||
      category.trim().length < 2 ||
      !amount
    ) {
      setMessage('Preencha descrição, categoria e valor.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await save({
        data: {
          idempotencyKey,
          description,
          category,
          classification,
          amount,
          occurredAt,
          notes,
        },
      })
      setEditorOpen(false)
      setDescription('')
      setCategory('')
      setAmount('')
      setNotes('')
      setIdempotencyKey(crypto.randomUUID())
      setMessage('Despesa registrada com sucesso.')
      await router.invalidate({ sync: true })
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a despesa.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <ManagementLayout
      title="Despesas"
      description="Registre despesas fixas e variáveis para acompanhar o resultado operacional."
    >
      <button
        type="button"
        onClick={() => setEditorOpen(true)}
        className="mb-4 rounded-lg bg-[#4a2114] px-4 py-2.5 font-bold text-white"
      >
        Registrar despesa
      </button>
      {!editorOpen && message ? (
        <p role="status" className="mb-4 rounded-lg bg-[#fff5e7] p-3 text-sm">
          {message}
        </p>
      ) : null}
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Despesas recentes</h2>
          </div>
          <form
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] px-5 py-4"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void navigate({
                search: (previous) => ({
                  ...previous,
                  query: String(form.get('query') ?? '').trim() || undefined,
                  start: String(form.get('start') ?? '') || undefined,
                  end: String(form.get('end') ?? '') || undefined,
                  page: 1,
                }),
              })
            }}
          >
            <label className="text-xs font-bold text-[#573524]">
              Buscar
              <input
                className="field mt-1 block min-w-48"
                name="query"
                defaultValue={search.query}
                placeholder="Descrição ou categoria"
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
          {history.expenses.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {history.expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-bold">{expense.description}</p>
                    <p className="mt-1 text-xs text-[#896d5b]">
                      {expense.category} ·{' '}
                      {expense.classification &&
                      expenseClassification.safeParse(expense.classification)
                        .success
                        ? expenseClassificationLabels[
                            expenseClassification.parse(expense.classification)
                          ]
                        : 'Classificação pendente'}{' '}
                      ·{' '}
                      {new Intl.DateTimeFormat('pt-BR').format(
                        new Date(`${expense.occurredAt}T12:00:00`),
                      )}
                    </p>
                  </div>
                  <strong>{currency.format(Number(expense.amount))}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-[#846859]">
              Nenhuma despesa encontrada para esses filtros.
            </p>
          )}
          <nav
            className="flex items-center justify-between gap-3 border-t border-[#f0e5dc] px-5 py-4 text-sm"
            aria-label="Paginação das despesas"
          >
            <span aria-live="polite">
              Página {history.page} de {history.totalPages} · {history.total}{' '}
              {history.total === 1 ? 'despesa' : 'despesas'}
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
        </section>
        {editorOpen ? (
          <OperationDialog
            title="Registrar despesa"
            pending={saving}
            onClose={() => setEditorOpen(false)}
          >
            <form
              onSubmit={submit}
              className="rounded-2xl border border-[#ecdfd4] bg-white p-5 space-y-4"
            >
              <h2 className="font-bold">Nova despesa</h2>
              <Input
                label="Descrição *"
                value={description}
                onChange={setDescription}
              />
              <Input
                label="Categoria *"
                value={category}
                onChange={setCategory}
                placeholder="Ex.: MEI, aluguel ou transporte"
              />
              <label className="block text-sm font-bold">
                Tratamento no resultado
                <select
                  className="field mt-1.5"
                  value={classification}
                  onChange={(e) =>
                    setClassification(
                      expenseClassification.parse(e.target.value),
                    )
                  }
                >
                  {Object.entries(expenseClassificationLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <p className="text-xs text-[#846859]">
                MEI: fixa, R$ 88/mês. Mão de obra: R$ 150 por dia; energia e mão
                de obra apropriadas nos lotes usam Produção. Insumos e
                embalagens devem entrar por Compras. Registre somente gastos
                reais; o orçamento não gera despesa automática.
              </p>
              <Input
                label="Valor *"
                value={amount}
                onChange={setAmount}
                placeholder="Ex.: 45,90"
                inputMode="decimal"
              />
              <Input
                label="Data *"
                value={occurredAt}
                onChange={setOccurredAt}
                type="date"
              />
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
                {saving ? 'Registrando...' : 'Registrar despesa'}
              </button>
            </form>
          </OperationDialog>
        ) : null}
      </div>
    </ManagementLayout>
  )
}

function ExpensesPending() {
  return (
    <ManagementLayout
      title="Despesas"
      description="Carregando o histórico de despesas."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Carregando despesas…
      </p>
    </ManagementLayout>
  )
}

function ExpensesError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Despesas"
      description="Não foi possível carregar o histórico de despesas."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>
          {(error instanceof Error && error.message) ||
            'Tente novamente em alguns instantes.'}
        </p>
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
