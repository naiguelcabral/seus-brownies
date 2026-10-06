import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import {
  createSalesLocation,
  listSalesLocations,
  salesLocationClassifications,
  setSalesLocationActive,
  updateSalesLocation,
} from '#/features/locations/functions'

const locationSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  classification: z
    .enum(salesLocationClassifications)
    .optional()
    .catch(undefined),
  activity: z.enum(['active', 'inactive']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/locais')({
  validateSearch: locationSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listSalesLocations({ data: deps }),
  component: SalesLocationsPage,
  pendingComponent: LocationsPending,
  pendingMs: 300,
  errorComponent: LocationsError,
})

const emptyForm = {
  name: '',
  classification:
    'unclassified' as (typeof salesLocationClassifications)[number],
  frequency: '',
  notes: '',
}

function SalesLocationsPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const createLocation = useServerFn(createSalesLocation)
  const updateLocation = useServerFn(updateSalesLocation)
  const setActive = useServerFn(setSalesLocationActive)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const data = { ...form }
      if (editingId) await updateLocation({ data: { ...data, id: editingId } })
      else await createLocation({ data })
      setForm(emptyForm)
      setEditingId(null)
      setMessage(editingId ? 'Local atualizado.' : 'Local criado.')
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o local.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ManagementLayout
      title="Locais e canais"
      description="Cadastre os pontos de venda usados nas vendas e nos relatórios."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <form
            role="search"
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] p-5"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const classification = String(data.get('classification') ?? '')
              const activity = String(data.get('activity') ?? '')
              void navigate({
                search: {
                  query: String(data.get('query') ?? '').trim() || undefined,
                  classification: (
                    salesLocationClassifications as readonly string[]
                  ).includes(classification)
                    ? (classification as (typeof salesLocationClassifications)[number])
                    : undefined,
                  activity:
                    activity === 'active' || activity === 'inactive'
                      ? activity
                      : undefined,
                  page: 1,
                },
              })
            }}
          >
            <Filter label="Busca" name="query" defaultValue={search.query} />
            <label className="text-xs font-bold">
              Tipo
              <select
                className="field mt-1 block"
                name="classification"
                defaultValue={search.classification ?? ''}
              >
                <option value="">Todos</option>
                {salesLocationClassifications.map((value) => (
                  <option key={value} value={value}>
                    {classificationLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">
              Situação
              <select
                className="field mt-1 block"
                name="activity"
                defaultValue={search.activity ?? ''}
              >
                <option value="">Todas</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
            <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold">
              Filtrar
            </button>
          </form>
          {result.locations.length ? (
            <ul className="divide-y divide-[#f0e5dc]">
              {result.locations.map((location) => (
                <li
                  key={location.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <strong>{location.name}</strong>
                    <p className="text-xs text-[#846859]">
                      {classificationLabel(location.classification)} ·{' '}
                      {location.frequency || 'frequência não informada'} ·{' '}
                      {location.isActive ? 'ativo' : 'inativo'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-bold"
                      onClick={() => {
                        setEditingId(location.id)
                        setForm({
                          name: location.name,
                          classification: location.classification,
                          frequency: location.frequency ?? '',
                          notes: location.notes ?? '',
                        })
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      className="text-xs font-bold text-[#a64f23] disabled:opacity-60"
                      onClick={async () => {
                        setSaving(true)
                        setMessage(null)
                        try {
                          await setActive({
                            data: {
                              id: location.id,
                              isActive: !location.isActive,
                            },
                          })
                          await router.invalidate()
                        } catch (error) {
                          setMessage(
                            error instanceof Error
                              ? error.message
                              : 'Não foi possível alterar o local.',
                          )
                        } finally {
                          setSaving(false)
                        }
                      }}
                    >
                      {location.isActive ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-[#846859]">
              Nenhum local encontrado.
            </p>
          )}
          <nav
            aria-label="Paginação dos locais"
            className="flex items-center justify-between border-t border-[#f0e5dc] px-5 py-4 text-sm"
          >
            <span aria-live="polite">
              Página {result.page} de {result.totalPages} · {result.total}{' '}
              locais
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={result.page === 1}
                className="rounded border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
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
              </button>
              <button
                type="button"
                disabled={result.page === result.totalPages}
                className="rounded border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
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
              </button>
            </div>
          </nav>
        </section>
        <form
          className="space-y-4 rounded-2xl border border-[#ecdfd4] bg-white p-5"
          onSubmit={submit}
        >
          <h2 className="font-bold">
            {editingId ? 'Editar local' : 'Novo local'}
          </h2>
          <EditField
            label="Nome"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <label className="block text-sm font-bold">
            Tipo
            <select
              className="field mt-1.5"
              value={form.classification}
              onChange={(event) =>
                setForm({
                  ...form,
                  classification: event.target
                    .value as typeof form.classification,
                })
              }
            >
              {salesLocationClassifications.map((value) => (
                <option key={value} value={value}>
                  {classificationLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <EditField
            label="Frequência"
            value={form.frequency}
            onChange={(frequency) => setForm({ ...form, frequency })}
          />
          <label className="block text-sm font-bold">
            Observação
            <textarea
              className="field mt-1.5 min-h-20"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </label>
          {message ? (
            <p
              aria-live="polite"
              className="rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]"
            >
              {message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              disabled={saving}
              className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="text-sm font-bold"
                onClick={() => {
                  setEditingId(null)
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

function classificationLabel(value: string) {
  return (
    (
      {
        unclassified: 'Não classificado',
        physical: 'Físico',
        online: 'Online',
        event: 'Evento',
        partner: 'Parceiro',
      } as Record<string, string>
    )[value] ?? value
  )
}
function Filter({
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
function EditField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className="field mt-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={label === 'Nome'}
      />
    </label>
  )
}
function LocationsPending() {
  return (
    <ManagementLayout
      title="Locais e canais"
      description="Carregando cadastro."
    >
      <p role="status" className="rounded-2xl bg-white p-5">
        Carregando locais…
      </p>
    </ManagementLayout>
  )
}
function LocationsError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Locais e canais"
      description="Não foi possível carregar o cadastro."
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
