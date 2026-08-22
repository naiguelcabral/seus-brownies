import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { ManagementLayout } from '#/components/ManagementLayout'
import { createExpense, listExpenses } from '#/features/operations/functions'

export const Route = createFileRoute('/despesas')({
  loader: () => listExpenses(),
  component: ExpensesPage,
})
function ExpensesPage() {
  const expenses = Route.useLoaderData()
  const router = useRouter()
  const save = useServerFn(createExpense)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredAt, setOccurredAt] = useState(
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
      await save({ data: { description, category, amount, occurredAt, notes } })
      setDescription('')
      setCategory('')
      setAmount('')
      setNotes('')
      setMessage('Despesa registrada com sucesso.')
      await router.invalidate()
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Despesas recentes</h2>
          </div>
          {expenses.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-bold">{expense.description}</p>
                    <p className="mt-1 text-xs text-[#896d5b]">
                      {expense.category} ·{' '}
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
              Nenhuma despesa registrada ainda.
            </p>
          )}
        </section>
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
            placeholder="Ex.: Embalagens"
          />
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
