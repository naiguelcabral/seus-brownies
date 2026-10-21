import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { ComponentProps } from 'react'
import { ProductEditor } from '../../../src/features/catalog/ProductEditor'
import type { ProductFormValues } from '../../../src/features/catalog/ProductEditor'
import './preview.css'

const sample: NonNullable<ComponentProps<typeof ProductEditor>['product']> = {
  id: 1,
  name: 'Brownie de ensaio',
  sku: 'QA-BROWNIE',
  type: 'finished_product',
  unit: 'unit',
  categoryId: null,
  categoryName: null,
  description: 'Somente ensaio local',
  salePrice: '12.50',
  reorderPoint: '3.000',
  preferredSupplierName: 'Fornecedor de ensaio',
  isActive: true,
}

function Preview() {
  const [mode, setMode] = useState<'new' | 'edit' | null>(null)
  const [outcome, setOutcome] = useState('success')
  const [calls, setCalls] = useState(0)
  const [saved, setSaved] = useState<ProductFormValues | null>(null)
  return (
    <main className="min-h-screen bg-[#faf6f0] p-5 text-[#4a2114]">
      <h1 className="text-2xl font-bold">Produtos — ensaio local</h1>
      <p className="my-3">Dados sintéticos, sem conexão com o banco.</p>
      <label>
        Resultado do salvamento{' '}
        <select
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        >
          <option value="success">Sucesso</option>
          <option value="retry">Falhar uma vez</option>
          <option value="slow">Demorado</option>
        </select>
      </label>
      <div className="my-4 flex gap-4">
        <button
          onClick={() => setMode('new')}
          className="rounded-lg bg-[#4a2114] px-4 py-3 text-white"
        >
          Adicionar produto
        </button>
        <button onClick={() => setMode('edit')}>
          Editar Brownie de ensaio
        </button>
      </div>
      <p data-testid="calls">{calls}</p>
      {saved ? <pre data-testid="saved">{JSON.stringify(saved)}</pre> : null}
      {mode ? (
        <ProductEditor
          product={mode === 'edit' ? sample : null}
          categories={[]}
          onCancel={() => setMode(null)}
          onSave={async (values) => {
            setCalls((previous) => previous + 1)
            if (outcome === 'slow')
              await new Promise((resolve) => setTimeout(resolve, 800))
            if (outcome === 'retry' && calls === 0)
              throw new Error('SKU já cadastrado. Confira o código.')
            setSaved(values)
            setMode(null)
          }}
        />
      ) : null}
    </main>
  )
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<Preview />)
