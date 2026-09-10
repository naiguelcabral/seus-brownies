import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import {
  actionPlanPriorities,
  actionPlanStatuses,
  createActionPlan,
  listActionPlans,
  updateActionPlan,
} from '#/features/action-plans/functions'

const actionPlanSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  priority: z.enum(actionPlanPriorities).optional().catch(undefined),
  status: z.enum(actionPlanStatuses).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/plano-de-acao')({
  validateSearch: actionPlanSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listActionPlans({ data: deps }),
  component: ActionPlanPage,
  pendingComponent: ActionPlanPending,
  pendingMs: 300,
  errorComponent: ActionPlanError,
})

type ActionPlanForm = {
  alert: string
  probableCause: string
  action: string
  priority: (typeof actionPlanPriorities)[number]
  kpi: string
  responsible: string
  dueDate: string
  status: (typeof actionPlanStatuses)[number]
}

const emptyForm: ActionPlanForm = {
  alert: '',
  probableCause: '',
  action: '',
  priority: 'medium',
  kpi: '',
  responsible: '',
  dueDate: '',
  status: 'open',
}

function ActionPlanPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const create = useServerFn(createActionPlan)
  const update = useServerFn(updateActionPlan)
  const [editing, setEditing] = useState<{
    id: number
    version: number
  } | null>(null)
  const [form, setForm] = useState<ActionPlanForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function change<TField extends keyof ActionPlanForm>(
    field: TField,
    value: ActionPlanForm[TField],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const data = { ...form, dueDate: form.dueDate || undefined }
      if (editing)
        await update({
          data: { ...data, id: editing.id, expectedVersion: editing.version },
        })
      else await create({ data })
      setEditing(null)
      setForm(emptyForm)
      setMessage(
        editing
          ? 'Ação atualizada e registrada no histórico.'
          : 'Ação criada e registrada no histórico.',
      )
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a ação.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ManagementLayout
      title="Plano de ação"
      description="Registre decisões humanas a partir de alertas reais; o sistema não presume causa nem recomenda ação automaticamente."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <form
            role="search"
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] p-5"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const priority = String(data.get('priority') ?? '')
              const status = String(data.get('status') ?? '')
              void navigate({
                search: {
                  query: String(data.get('query') ?? '').trim() || undefined,
                  priority: (
                    actionPlanPriorities as readonly string[]
                  ).includes(priority)
                    ? (priority as ActionPlanForm['priority'])
                    : undefined,
                  status: (actionPlanStatuses as readonly string[]).includes(
                    status,
                  )
                    ? (status as ActionPlanForm['status'])
                    : undefined,
                  page: 1,
                },
              })
            }}
          >
            <FilterInput
              label="Busca"
              name="query"
              defaultValue={search.query}
            />
            <FilterSelect
              label="Prioridade"
              name="priority"
              defaultValue={search.priority}
              options={actionPlanPriorities}
              labels={priorityLabels}
            />
            <FilterSelect
              label="Status"
              name="status"
              defaultValue={search.status}
              options={actionPlanStatuses}
              labels={statusLabels}
            />
            <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold">
              Filtrar
            </button>
          </form>
          {result.actionPlans.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {result.actionPlans.map((item) => (
                <li className="p-5" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.alert}</p>
                      <p className="mt-1 text-sm text-[#573524]">
                        {item.action}
                      </p>
                      <p className="mt-2 text-xs text-[#846859]">
                        {priorityLabels[item.priority]} ·{' '}
                        {statusLabels[item.status]} · KPI:{' '}
                        {item.kpi || 'não informado'} · responsável:{' '}
                        {item.responsible || 'não definido'} · prazo:{' '}
                        {item.dueDate || 'não definido'}
                      </p>
                      {item.probableCause ? (
                        <p className="mt-2 text-xs text-[#846859]">
                          Causa provável confirmada pelo responsável:{' '}
                          {item.probableCause}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#a64f23]"
                      onClick={() => {
                        setEditing({ id: item.id, version: item.version })
                        setForm({
                          alert: item.alert,
                          probableCause: item.probableCause ?? '',
                          action: item.action,
                          priority: item.priority,
                          kpi: item.kpi ?? '',
                          responsible: item.responsible ?? '',
                          dueDate: item.dueDate ?? '',
                          status: item.status,
                        })
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-[#846859]">
              Nenhuma ação encontrada.
            </p>
          )}
          <nav
            aria-label="Paginação das ações"
            className="flex items-center justify-between border-t border-[#f0e5dc] px-5 py-4 text-sm"
          >
            <span aria-live="polite">
              Página {result.page} de {result.totalPages} · {result.total} ações
            </span>
            <div className="flex gap-2">
              <PageButton
                disabled={result.page === 1}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: result.page - 1,
                    }),
                  })
                }
              >
                Anterior
              </PageButton>
              <PageButton
                disabled={result.page === result.totalPages}
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: result.page + 1,
                    }),
                  })
                }
              >
                Próxima
              </PageButton>
            </div>
          </nav>
        </section>
        <form
          className="space-y-4 rounded-2xl border border-[#ecdfd4] bg-white p-5"
          onSubmit={submit}
        >
          <h2 className="font-bold">{editing ? 'Editar ação' : 'Nova ação'}</h2>
          <TextArea
            label="Alerta observado"
            value={form.alert}
            onChange={(value) => change('alert', value)}
            required
          />
          <TextArea
            label="Causa provável (confirmação humana)"
            value={form.probableCause}
            onChange={(value) => change('probableCause', value)}
          />
          <TextArea
            label="Ação definida"
            value={form.action}
            onChange={(value) => change('action', value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <EditSelect
              label="Prioridade"
              value={form.priority}
              onChange={(value) =>
                change('priority', value as ActionPlanForm['priority'])
              }
              options={actionPlanPriorities}
              labels={priorityLabels}
            />
            <EditSelect
              label="Status"
              value={form.status}
              onChange={(value) =>
                change('status', value as ActionPlanForm['status'])
              }
              options={actionPlanStatuses}
              labels={statusLabels}
            />
          </div>
          <TextInput
            label="KPI"
            value={form.kpi}
            onChange={(value) => change('kpi', value)}
          />
          <TextInput
            label="Responsável"
            value={form.responsible}
            onChange={(value) => change('responsible', value)}
          />
          <TextInput
            label="Prazo"
            type="date"
            value={form.dueDate}
            onChange={(value) => change('dueDate', value)}
          />
          {message ? (
            <p
              aria-live="polite"
              className="rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]"
            >
              {message}
            </p>
          ) : null}
          <div className="flex gap-3">
            <button
              disabled={saving}
              className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar ação'}
            </button>
            {editing ? (
              <button
                type="button"
                className="text-sm font-bold"
                onClick={() => {
                  setEditing(null)
                  setForm(emptyForm)
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </ManagementLayout>
  )
}

const priorityLabels: Record<ActionPlanForm['priority'], string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}
const statusLabels: Record<ActionPlanForm['status'], string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}
function FilterInput({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue?: string
}) {
  return (
    <label className="text-xs font-bold">
      {label}
      <input
        className="field mt-1 block"
        name={name}
        defaultValue={defaultValue}
      />
    </label>
  )
}
function FilterSelect({
  label,
  name,
  defaultValue,
  options,
  labels,
}: {
  label: string
  name: string
  defaultValue?: string
  options: readonly string[]
  labels: Record<string, string>
}) {
  return (
    <label className="text-xs font-bold">
      {label}
      <select
        className="field mt-1 block"
        name={name}
        defaultValue={defaultValue ?? ''}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
function TextInput({
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
    <label className="block text-sm font-bold">
      {label}
      <input
        className="field mt-1.5"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <textarea
        className="field mt-1.5 min-h-20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </label>
  )
}
function EditSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  labels: Record<string, string>
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <select
        className="field mt-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
function ActionPlanPending() {
  return (
    <ManagementLayout title="Plano de ação" description="Carregando ações.">
      <p role="status" className="rounded-2xl bg-white p-5">
        Carregando ações…
      </p>
    </ManagementLayout>
  )
}
function ActionPlanError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Plano de ação"
      description="Não foi possível carregar as ações."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>{error.message || 'Tente novamente.'}</p>
        <button
          className="mt-3 rounded border px-3 py-2 text-xs font-bold"
          onClick={() => void router.invalidate()}
        >
          Tentar novamente
        </button>
      </div>
    </ManagementLayout>
  )
}
