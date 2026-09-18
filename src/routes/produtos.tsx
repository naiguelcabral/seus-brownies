import { useState } from 'react'
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
type Category = Awaited<ReturnType<typeof listCategories>>[number]
type ProductType = 'ingredient' | 'packaging' | 'finished_product'
type ProductFormValues = {
  name: string
  sku: string
  type: ProductType
  unit: 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'
  categoryId: number | null
  description: string
  salePrice: string
}

const typeLabels: Record<ProductType, string> = {
  ingredient: 'Ingrediente',
  packaging: 'Embalagem',
  finished_product: 'Produto final',
}

const unitLabels = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  m: 'm',
  unit: 'unidade',
}

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
  const [notice, setNotice] = useState<string | null>(null)

  async function save(values: ProductFormValues) {
    setNotice(null)
    try {
      if (editing) {
        await update({ data: { id: editing.id, ...values } })
        setNotice('Produto atualizado com sucesso.')
      } else {
        await create({ data: values })
        setNotice('Produto criado com sucesso.')
      }
      setEditing(null)
      await router.invalidate()
    } catch (error) {
      setNotice(readableError(error))
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
      <div
        className={
          canWrite
            ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]'
            : 'grid gap-6'
        }
      >
        <section className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0e5dc] px-5 py-4">
            <h2 className="font-bold">Produtos cadastrados</h2>
            <span className="rounded-full bg-[#f8eee4] px-2.5 py-1 text-xs font-bold text-[#92522e]">
              {history.total}
            </span>
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
                                onClick={() => setEditing(product)}
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
        {canWrite ? (
          <ProductForm
            key={editing?.id ?? 'new'}
            product={editing}
            categories={categories}
            onCancel={() => setEditing(null)}
            onSave={save}
            notice={notice}
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

function ProductsError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Produtos"
      description="Não foi possível carregar o catálogo de produtos."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>{error.message || 'Tente novamente em alguns instantes.'}</p>
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

function ProductForm({
  product,
  categories,
  onCancel,
  onSave,
  notice,
}: {
  product: Product | null
  categories: Category[]
  onCancel: () => void
  onSave: (values: ProductFormValues) => Promise<void>
  notice: string | null
}) {
  const [values, setValues] = useState<ProductFormValues>({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    type: product?.type ?? 'finished_product',
    unit: product?.unit ?? 'unit',
    categoryId: product?.categoryId ?? null,
    description: product?.description ?? '',
    salePrice: product?.salePrice ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const priceRequired = values.type === 'finished_product'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (values.name.trim().length < 2 || values.sku.trim().length < 2) {
      setError('Preencha nome e SKU com pelo menos 2 caracteres.')
      return
    }
    if (priceRequired && !values.salePrice.trim()) {
      setError('Informe o preço de venda do produto final.')
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
          {product ? 'Editar produto' : 'Novo produto'}
        </h2>
      </div>
      <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
        <Input
          label="Nome"
          required
          value={values.name}
          onChange={(name) => setValues({ ...values, name })}
          maxLength={120}
          autoFocus
        />
        <Input
          label="SKU"
          required
          value={values.sku}
          onChange={(sku) => setValues({ ...values, sku: sku.toUpperCase() })}
          maxLength={64}
        />
        <Select
          label="Tipo"
          value={values.type}
          onChange={(type) =>
            setValues({ ...values, type: type as ProductType })
          }
        >
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Unidade de medida"
          value={values.unit}
          onChange={(unit) =>
            setValues({ ...values, unit: unit as ProductFormValues['unit'] })
          }
        >
          {Object.entries(unitLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Categoria"
          value={values.categoryId ?? ''}
          onChange={(categoryId) =>
            setValues({
              ...values,
              categoryId: categoryId ? Number(categoryId) : null,
            })
          }
        >
          <option value="">Sem categoria</option>
          {categories
            .filter(
              (category) =>
                category.isActive || category.id === product?.categoryId,
            )
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : ' (inativa)'}
              </option>
            ))}
        </Select>
        <label className="block text-sm font-bold text-[#573524]">
          Descrição
          <textarea
            value={values.description}
            onChange={(event) =>
              setValues({ ...values, description: event.target.value })
            }
            className="field mt-1.5 min-h-20 resize-y"
            maxLength={1000}
          />
        </label>
        <Input
          label={`Preço de venda${priceRequired ? ' *' : ' (opcional)'}`}
          value={values.salePrice}
          onChange={(salePrice) => setValues({ ...values, salePrice })}
          placeholder="Ex.: 12,50"
          inputMode="decimal"
        />
        <p className="-mt-2 text-xs text-[#896d5b]">
          {priceRequired
            ? 'Obrigatório para produto final.'
            : 'Opcional para ingredientes e embalagens.'}
        </p>
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
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
              : product
                ? 'Salvar alterações'
                : 'Criar produto'}
          </button>
          {product ? (
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

function Input({
  label,
  required = false,
  value,
  onChange,
  ...props
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block text-sm font-bold text-[#573524]">
      {label}
      {required ? ' *' : ''}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-1.5"
        {...props}
      />
    </label>
  )
}
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm font-bold text-[#573524]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-1.5"
      >
        {children}
      </select>
    </label>
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
