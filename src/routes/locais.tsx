import { Plus } from 'lucide-react'
import {
  LocationEditor,
  locationLabels,
} from '#/features/locations/LocationEditor'
import type { LocationFormValues } from '#/features/locations/LocationEditor'
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

type SalesLocation = Awaited<
  ReturnType<typeof listSalesLocations>
>['locations'][number]

function SalesLocationsPage() {
  const result = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const createLocation = useServerFn(createSalesLocation)
  const updateLocation = useServerFn(updateSalesLocation)
  const setActive = useServerFn(setSalesLocationActive)
  const [editing, setEditing] = useState<SalesLocation | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save(values: LocationFormValues) {
    if (editing) await updateLocation({ data: { ...values, id: editing.id } })
    else await createLocation({ data: values })
    setMessage(editing ? 'Local atualizado.' : 'Local criado.')
    setEditorOpen(false)
    setEditing(null)
    try {
      await router.invalidate()
    } catch {
      setMessage('Local salvo. Atualize a página para conferir a lista.')
    }
  }

  return (
    <ManagementLayout
      title="Locais e canais"
      description="Cadastre os pontos de venda usados nas vendas e nos relatórios."
    >
      {message ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-[#ecdfd4] bg-[#fff5e7] p-4 text-sm text-[#75411f]"
        >
          {message}
        </p>
      ) : null}
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Locais cadastrados</h2>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#f8eee4] px-2.5 py-1 text-xs font-bold text-[#92522e]">
                {result.total}
              </span>
              <button
                type="button"
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2 rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#653321]"
                onClick={() => {
                  setEditing(null)
                  setMessage(null)
                  setEditorOpen(true)
                }}
              >
                <Plus size={17} aria-hidden="true" />
                Adicionar local
              </button>
            </div>
          </div>
          <form
            key={JSON.stringify(search)}
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
            {search.query || search.classification || search.activity ? (
              <button
                type="button"
                className="px-3 py-2 text-xs font-bold text-[#75411f]"
                onClick={() => void navigate({ search: { page: 1 } })}
              >
                Limpar filtros
              </button>
            ) : null}
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
                      aria-haspopup="dialog"
                      aria-label={`Editar ${location.name}`}
                      onClick={() => {
                        setEditing(location)
                        setMessage(null)
                        setEditorOpen(true)
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
        {editorOpen ? (
          <LocationEditor
            key={editing?.id ?? 'new'}
            location={editing}
            onCancel={() => {
              setEditorOpen(false)
              setEditing(null)
            }}
            onSave={save}
          />
        ) : null}
      </div>
    </ManagementLayout>
  )
}

function classificationLabel(value: keyof typeof locationLabels) {
  return locationLabels[value]
}
function Filter({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue?: string | undefined
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
function LocationsError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Locais e canais"
      description="Não foi possível carregar o cadastro."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>{(error instanceof Error && error.message) || 'Tente novamente.'}</p>
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
