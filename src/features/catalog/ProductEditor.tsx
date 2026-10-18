import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { listCategories, listProducts } from './functions'

type Product = Awaited<ReturnType<typeof listProducts>>['products'][number]
type Category = Awaited<ReturnType<typeof listCategories>>[number]
type ProductType = 'ingredient' | 'packaging' | 'finished_product'
export type ProductFormValues = {
  name: string
  sku: string
  type: ProductType
  unit: 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'
  categoryId: number | null
  description: string
  salePrice: string
  reorderPoint: string
  preferredSupplierName: string
}

export const typeLabels: Record<ProductType, string> = {
  ingredient: 'Ingrediente',
  packaging: 'Embalagem',
  finished_product: 'Produto final',
}

export const unitLabels = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  m: 'm',
  unit: 'unidade',
}

export function ProductEditor({
  product,
  categories,
  onCancel,
  onSave,
}: {
  product: Product | null
  categories: Category[]
  onCancel: () => void
  onSave: (values: ProductFormValues) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pendingRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const initialValues: ProductFormValues = {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    type: product?.type ?? 'finished_product',
    unit: product?.unit ?? 'unit',
    categoryId: product?.categoryId ?? null,
    description: product?.description ?? '',
    salePrice: product?.salePrice ?? '',
    reorderPoint: product?.reorderPoint ?? '',
    preferredSupplierName: product?.preferredSupplierName ?? '',
  }
  const [values, setValues] = useState(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const priceRequired = values.type === 'finished_product'

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    dialog?.querySelector('input')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  function requestClose() {
    if (pendingRef.current) return
    if (
      JSON.stringify(values) !== JSON.stringify(initialValues) &&
      !window.confirm('Descartar as alterações deste produto?')
    )
      return
    onCancel()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    if (values.name.trim().length < 2 || values.sku.trim().length < 2) {
      setError('Preencha nome e SKU com pelo menos 2 caracteres.')
      return
    }
    if (priceRequired && !values.salePrice.trim()) {
      setError('Informe o preço de venda do produto final.')
      return
    }
    setError(null)
    pendingRef.current = true
    setSubmitting(true)
    try {
      await onSave(values)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar. Tente novamente.',
      )
    } finally {
      pendingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[#ecdfd4] bg-white p-0 text-[#4a2114] shadow-2xl backdrop:bg-[#25150d]/60"
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ecdfd4] bg-white px-5 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {product ? 'Editar produto' : 'Adicionar produto'}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-[#846859]">
            Preencha os dados do produto. Campos com * são obrigatórios.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar cadastro de produto"
          disabled={submitting}
          onClick={requestClose}
          className="rounded-lg p-2 text-[#795747] hover:bg-[#fff8f2] disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </header>
      <form onSubmit={submit} noValidate aria-busy={submitting}>
        <fieldset
          disabled={submitting}
          className="grid gap-4 p-5 sm:grid-cols-2"
        >
          <Input
            label="Nome"
            required
            value={values.name}
            onChange={(name) => setValues({ ...values, name })}
            maxLength={120}
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
          <Input
            label={`Preço de venda${priceRequired ? '' : ' (opcional)'}`}
            required={priceRequired}
            value={values.salePrice}
            onChange={(salePrice) => setValues({ ...values, salePrice })}
            placeholder="Ex.: 12,50"
            inputMode="decimal"
          />
          <p className="-mt-2 text-xs text-[#896d5b] sm:col-span-2">
            {priceRequired
              ? 'Obrigatório para produto final.'
              : 'Opcional para ingredientes e embalagens.'}
          </p>
          <details
            className="rounded-xl border border-[#ecdfd4] p-4 sm:col-span-2"
            open={Boolean(
              product?.description ||
              product?.reorderPoint ||
              product?.preferredSupplierName,
            )}
          >
            <summary className="cursor-pointer text-sm font-bold">
              Mais informações (opcional)
            </summary>
            <div className="mt-4 space-y-4">
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
                label="Ponto de reposição (opcional)"
                value={values.reorderPoint}
                onChange={(reorderPoint) =>
                  setValues({ ...values, reorderPoint })
                }
                placeholder={`Na unidade ${unitLabels[values.unit]}`}
                inputMode="decimal"
              />
              <p className="-mt-2 text-xs text-[#896d5b]">
                O alerta compara o saldo calculado a este limite; não altera
                estoque.
              </p>
              <Input
                label="Fornecedor padrão (opcional)"
                value={values.preferredSupplierName}
                onChange={(preferredSupplierName) =>
                  setValues({ ...values, preferredSupplierName })
                }
                maxLength={160}
                placeholder="Referência para a próxima compra"
              />
              <p className="-mt-2 text-xs text-[#896d5b]">
                Campo informativo. Cada compra mantém o fornecedor realmente
                usado.
              </p>
            </div>
          </details>
        </fieldset>
        {error ? (
          <p
            role="alert"
            className="mx-5 mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#ecdfd4] bg-white px-5 py-4">
          <button
            disabled={submitting}
            className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting
              ? 'Salvando...'
              : product
                ? 'Salvar alterações'
                : 'Adicionar produto'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={requestClose}
            className="rounded-lg border border-[#e6d4c5] px-4 py-2.5 text-sm font-bold text-[#795747] disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
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
        required={required}
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
