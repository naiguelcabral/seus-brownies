import { useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { CategoryEditor } from '#/features/catalog/CategoryEditor'
import type { CategoryFormValues } from '#/features/catalog/CategoryEditor'
import { ManagementLayout } from '#/components/ManagementLayout'
import { hasPermission } from '#/features/auth/authorization'
import {
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from '#/features/catalog/functions'

export const Route = createFileRoute('/categorias')({
  loader: () => listCategories(),
  component: CategoriesPage,
})

type Category = Awaited<ReturnType<typeof listCategories>>[number]

function CategoriesPage() {
  const categories = Route.useLoaderData()
  const { appRole } = Route.useRouteContext()
  const canWrite = Boolean(appRole && hasPermission(appRole, 'catalog:write'))
  const router = useRouter()
  const create = useServerFn(createCategory)
  const update = useServerFn(updateCategory)
  const setActive = useServerFn(setCategoryActive)
  const [editorOpen, setEditorOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activity, setActivity] = useState('all')
  const visibleCategories = categories.filter((category) => {
    const matchesQuery = `${category.name} ${category.description ?? ''}`
      .toLocaleLowerCase('pt-BR')
      .includes(query.trim().toLocaleLowerCase('pt-BR'))
    return (
      matchesQuery &&
      (activity === 'all' || category.isActive === (activity === 'active'))
    )
  })
  const [editing, setEditing] = useState<Category | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function save(values: CategoryFormValues) {
    if (editing) await update({ data: { id: editing.id, ...values } })
    else await create({ data: values })
    setNotice(
      editing
        ? 'Categoria atualizada com sucesso.'
        : 'Categoria criada com sucesso.',
    )
    setEditorOpen(false)
    setEditing(null)
    try {
      await router.invalidate()
    } catch {
      setNotice('Categoria salva. Atualize a página para conferir a lista.')
    }
  }

  async function toggle(category: Category) {
    setNotice(null)
    try {
      await setActive({
        data: { id: category.id, isActive: !category.isActive },
      })
      setNotice(
        category.isActive
          ? 'Categoria desativada.'
          : 'Categoria ativada novamente.',
      )
      await router.invalidate()
    } catch (error) {
      setNotice(readableError(error))
    }
  }

  return (
    <ManagementLayout
      title="Categorias"
      description="Agrupe seus produtos para deixar o cadastro e os relatórios organizados. Categorias desativadas permanecem no histórico."
    >
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-[#ecdfd4] bg-[#fff5e7] p-4 text-sm text-[#75411f]"
        >
          {notice}
        </p>
      ) : null}
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Categorias cadastradas</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#f8eee4] px-2.5 py-1 text-xs font-bold text-[#92522e]">
                {visibleCategories.length} de {categories.length}
              </span>
              {canWrite ? (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setEditing(null)
                    setNotice(null)
                    setEditorOpen(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#653321]"
                >
                  <Plus size={17} aria-hidden="true" />
                  Adicionar categoria
                </button>
              ) : null}
            </div>
          </div>
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] p-5"
          >
            <label className="min-w-48 flex-1 text-xs font-bold text-[#573524]">
              Buscar categoria
              <input
                className="field mt-1 block"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={100}
                placeholder="Nome ou descrição"
              />
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Situação
              <select
                className="field mt-1 block"
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
              >
                <option value="all">Todas</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </select>
            </label>
            {query || activity !== 'all' ? (
              <button
                type="button"
                className="px-3 py-2 text-xs font-bold text-[#75411f]"
                onClick={() => {
                  setQuery('')
                  setActivity('all')
                }}
              >
                Limpar filtros
              </button>
            ) : null}
          </form>
          {visibleCategories.length === 0 ? (
            <p className="p-6 text-sm text-[#846859]">
              {categories.length
                ? 'Nenhuma categoria encontrada para esses filtros.'
                : 'Nenhuma categoria cadastrada.'}
            </p>
          ) : (
            <ul className="divide-y divide-[#f0e5dc]">
              {visibleCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{category.name}</p>
                      <Status active={category.isActive} />
                    </div>
                    {category.description ? (
                      <p className="mt-1 text-sm text-[#846859]">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  {canWrite ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`Editar ${category.name}`}
                        onClick={() => {
                          setEditing(category)
                          setNotice(null)
                          setEditorOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6d4c5] px-3 py-2 text-sm font-bold text-[#72462f] hover:bg-[#fff8f2]"
                      >
                        <Pencil size={15} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(category)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6d4c5] px-3 py-2 text-sm font-bold text-[#72462f] hover:bg-[#fff8f2]"
                      >
                        <Power size={15} />
                        {category.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {canWrite && editorOpen ? (
          <CategoryEditor
            key={editing?.id ?? 'new'}
            category={editing}
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

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}
    >
      {active ? 'Ativa' : 'Inativa'}
    </span>
  )
}

function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Não foi possível salvar. Tente novamente.'
}
