import { useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

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
type CategoryFormValues = { name: string; description: string }

function CategoriesPage() {
  const categories = Route.useLoaderData()
  const { appRole } = Route.useRouteContext()
  const canWrite = Boolean(appRole && hasPermission(appRole, 'catalog:write'))
  const router = useRouter()
  const create = useServerFn(createCategory)
  const update = useServerFn(updateCategory)
  const setActive = useServerFn(setCategoryActive)
  const [editing, setEditing] = useState<Category | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function save(values: CategoryFormValues) {
    setNotice(null)

    try {
      if (editing) {
        await update({ data: { id: editing.id, ...values } })
        setNotice('Categoria atualizada com sucesso.')
      } else {
        await create({ data: values })
        setNotice('Categoria criada com sucesso.')
      }
      setEditing(null)
      await router.invalidate()
    } catch (error) {
      setNotice(readableError(error))
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
      <div
        className={
          canWrite
            ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'
            : 'grid gap-6'
        }
      >
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Categorias cadastradas</h2>
            <span className="rounded-full bg-[#f8eee4] px-2.5 py-1 text-xs font-bold text-[#92522e]">
              {categories.length}
            </span>
          </div>
          {categories.length === 0 ? (
            <p className="p-6 text-sm text-[#846859]">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            <ul className="divide-y divide-[#f0e5dc]">
              {categories.map((category) => (
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
                        onClick={() => setEditing(category)}
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

        {canWrite ? (
          <CategoryForm
            key={editing?.id ?? 'new'}
            category={editing}
            onCancel={() => setEditing(null)}
            onSave={save}
            notice={notice}
          />
        ) : null}
      </div>
    </ManagementLayout>
  )
}

function CategoryForm({
  category,
  onCancel,
  onSave,
  notice,
}: {
  category: Category | null
  onCancel: () => void
  onSave: (values: CategoryFormValues) => Promise<void>
  notice: string | null
}) {
  const [values, setValues] = useState<CategoryFormValues>({
    name: category?.name ?? '',
    description: category?.description ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.name.trim().length < 2) {
      setError('O nome da categoria deve ter pelo menos 2 caracteres.')
      return
    }

    setError(null)
    setSubmitting(true)
    await onSave(values)
    setSubmitting(false)
  }

  return (
    <aside className="h-fit rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[#fff0e3] p-2 text-[#a64f23]">
          <Plus size={17} />
        </span>
        <h2 className="font-bold">
          {category ? 'Editar categoria' : 'Nova categoria'}
        </h2>
      </div>
      <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
        <Field label="Nome" required error={error}>
          <input
            value={values.name}
            onChange={(event) =>
              setValues({ ...values, name: event.target.value })
            }
            className="field"
            maxLength={80}
            autoFocus
          />
        </Field>
        <Field label="Descrição">
          <textarea
            value={values.description}
            onChange={(event) =>
              setValues({ ...values, description: event.target.value })
            }
            className="field min-h-24 resize-y"
            maxLength={500}
          />
        </Field>
        {notice ? (
          <p className="rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]">
            {notice}
          </p>
        ) : null}
        <div className="flex gap-2 pt-1">
          <button
            disabled={submitting}
            className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting
              ? 'Salvando...'
              : category
                ? 'Salvar alterações'
                : 'Criar categoria'}
          </button>
          {category ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-2 text-sm font-bold text-[#795747]"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
    </aside>
  )
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-bold text-[#573524]">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </label>
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
