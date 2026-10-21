import { useState } from 'react'
import {
  ProductEditor,
  typeLabels,
  unitLabels,
} from '#/features/catalog/ProductEditor'
import type { ProductFormValues } from '#/features/catalog/ProductEditor'
import { Pencil, Plus, Power } from 'lucide-react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { hasPermission } from '#/features/auth/authorization'
import {
  createProduct,
  listCategories,
  listProducts,
  setProductActive,
  updateProduct,
} from '#/features/catalog/functions'

const productSearch = z.object({
  query: z.string().trim().max(100).optional().catch(undefined),
  type: z
    .enum(['ingredient', 'packaging', 'finished_product'])
    .optional()
    .catch(undefined),
  activity: z.enum(['active', 'inactive']).optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).catch(1),
})

export const Route = createFileRoute('/produtos')({
  validateSearch: productSearch,
  loaderDeps: ({ search }) => ({
    query: search.query,
    type: search.type,
    activity: search.activity,
    page: search.page,
  }),
  loader: async ({ deps }) => ({
    history: await listProducts({ data: deps }),
    categories: await listCategories(),
  }),
  component: ProductsPage,
  pendingComponent: ProductsPending,
  pendingMs: 300,
  errorComponent: ProductsError,
})

type Product = Awaited<ReturnType<typeof listProducts>>['products'][number]
function ProductsPage() {
  const { history, categories } = Route.useLoaderData()
  const search = Route.useSearch()
  const { appRole } = Route.useRouteContext()
  const canWrite = Boolean(appRole && hasPermission(appRole, 'catalog:write'))
  const router = useRouter()
  const navigate = useNavigate({ from: Route.fullPath })
  const create = useServerFn(createProduct)
  const update = useServerFn(updateProduct)
  const setActive = useServerFn(setProductActive)
  const [editing, setEditing] = useState<Product | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function save(values: ProductFormValues) {
    if (editing) {
      await update({ data: { id: editing.id, ...values } })
    } else {
      await create({ data: values })
    }
    setNotice(
      editing
        ? 'Produto atualizado com sucesso.'
        : 'Produto criado com sucesso.',
    )
    setEditorOpen(false)
    setEditing(null)
    try {
      await router.invalidate()
    } catch {
      setNotice('Produto salvo. Atualize a página para conferir a lista.')
    }
  }

  async function toggle(product: Product) {
    setNotice(null)
    try {
      await setActive({ data: { id: product.id, isActive: !product.isActive } })
      setNotice(
        product.isActive ? 'Produto desativado.' : 'Produto ativado novamente.',
      )
      await router.invalidate()
    } catch (error) {
      setNotice(readableError(error))
    }
  }

  return (
    <ManagementLayout
      title="Produtos"
      description="Cadastre ingredientes, embalagens e produtos finais. Nenhum item é excluído: você pode desativá-lo quando não fizer mais parte da operação."
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
            <h2 className="font-bold">Produtos cadastrados</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#f8eee4] px-2.5 py-1 text-xs font-bold text-[#92522e]">
                {history.total}
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
                  Adicionar produto
                </button>
              ) : null}
            </div>
          </div>
          <form
            className="flex flex-wrap items-end gap-3 border-b border-[#f0e5dc] px-5 py-4"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const selectedType = String(form.get('type') ?? '')
              const selectedActivity = String(form.get('activity') ?? '')
              void navigate({
                search: (previous) => ({
                  ...previous,
                  query: String(form.get('query') ?? '').trim() || undefined,
                  type:
                    selectedType === 'ingredient' ||
                    selectedType === 'packaging' ||
                    selectedType === 'finished_product'
                      ? selectedType
                      : undefined,
                  activity:
                    selectedActivity === 'active' ||
                    selectedActivity === 'inactive'
                      ? selectedActivity
                      : undefined,
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
                placeholder="Nome ou SKU"
              />
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Tipo
              <select
                className="field mt-1 block"
                name="type"
                defaultValue={search.type ?? ''}
              >
                <option value="">Todos</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-[#573524]">
              Situação
              <select
                className="field mt-1 block"
                name="activity"
                defaultValue={search.activity ?? ''}
              >
                <option value="">Todas</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </label>
            <button className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold text-[#4a2114]">
              Filtrar
            </button>
            {search.query || search.type || search.activity ? (
              <button
                type="button"
                className="px-2 py-2 text-xs font-bold text-[#75411f]"
                onClick={() => void navigate({ search: { page: 1 } })}
              >
                Limpar filtros
              </button>
            ) : null}
          </form>
          {history.products.length === 0 ? (
            <p className="p-6 text-sm text-[#846859]">
              Nenhum produto encontrado para esses filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#fffaf5] text-xs uppercase tracking-wide text-[#896d5b]">
                  <tr>
                    <th className="px-5 py-3 font-bold">Produto</th>
                    <th className="px-4 py-3 font-bold">Tipo</th>
                    <th className="px-4 py-3 font-bold">Categoria</th>
                    <th className="px-4 py-3 font-bold">Preço</th>
                    <th className="px-5 py-3 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e5dc]">
                  {history.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold">{product.name}</p>
                        <p className="mt-1 text-xs font-medium text-[#896d5b]">
                          SKU: {product.sku} · {unitLabels[product.unit]}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#f8eee4] px-2 py-1 text-xs font-bold text-[#805038]">
                          {typeLabels[product.type]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#755b4d]">
                        {product.categoryName ?? 'Sem categoria'}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {product.salePrice
                          ? currency.format(Number(product.salePrice))
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Status active={product.isActive} />
                          {canWrite ? (
                            <>
                              <button
                                type="button"
                                aria-haspopup="dialog"
                                onClick={() => {
                                  setEditing(product)
                                  setNotice(null)
                                  setEditorOpen(true)
                                }}
                                className="rounded-lg border border-[#e6d4c5] p-2 text-[#72462f] hover:bg-[#fff8f2]"
                                aria-label={`Editar ${product.name}`}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggle(product)}
                                className="rounded-lg border border-[#e6d4c5] p-2 text-[#72462f] hover:bg-[#fff8f2]"
                                aria-label={
                                  product.isActive
                                    ? `Desativar ${product.name}`
                                    : `Ativar ${product.name}`
                                }
                              >
                                <Power size={15} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav
            className="flex items-center justify-between gap-3 border-t border-[#f0e5dc] px-5 py-4 text-sm"
            aria-label="Paginação dos produtos"
          >
            <span aria-live="polite">
              Página {history.page} de {history.totalPages} · {history.total}{' '}
              {history.total === 1 ? 'produto' : 'produtos'}
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
        {canWrite && editorOpen ? (
          <ProductEditor
            key={editing?.id ?? 'new'}
            product={editing}
            categories={categories}
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

function ProductsPending() {
  return (
    <ManagementLayout
      title="Produtos"
      description="Carregando o catálogo de produtos."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Carregando produtos…
      </p>
    </ManagementLayout>
  )
}

function ProductsError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Produtos"
      description="Não foi possível carregar o catálogo de produtos."
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

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}
function readableError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Não foi possível salvar. Tente novamente.'
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
