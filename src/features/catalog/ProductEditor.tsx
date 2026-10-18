import { useState } from 'react'
import { EditorDialog } from '../../components/EditorDialog'
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
  const priceRequired = values.type === 'finished_product'
  async function save() {
    if (values.name.trim().length < 2 || values.sku.trim().length < 2)
      throw new Error('Preencha nome e SKU com pelo menos 2 caracteres.')
    if (priceRequired && !values.salePrice.trim())
      throw new Error('Informe o preço de venda do produto final.')
    await onSave(values)
  }

  return (
    <EditorDialog
      title={product ? 'Editar produto' : 'Adicionar produto'}
      description="Preencha os dados do produto. Campos com * são obrigatórios."
      closeLabel="Fechar cadastro de produto"
      submitLabel={product ? 'Salvar alterações' : 'Adicionar produto'}
      dirty={JSON.stringify(values) !== JSON.stringify(initialValues)}
      onCancel={onCancel}
      onSave={save}
      wide
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
        onChange={(type) => setValues({ ...values, type: type as ProductType })}
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
            onChange={(reorderPoint) => setValues({ ...values, reorderPoint })}
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
            Campo informativo. Cada compra mantém o fornecedor realmente usado.
          </p>
        </div>
      </details>
    </EditorDialog>
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
