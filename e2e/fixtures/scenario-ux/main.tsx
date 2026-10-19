import { useState } from 'react'
import { requireDefined } from '../../../src/lib/required-value'
import { createRoot } from 'react-dom/client'
import { OperationDialog } from '../../../src/components/OperationDialog'
import { ScenarioEditor } from '../../../src/features/scenarios/ScenarioEditor'
import type { ScenarioForm } from '../../../src/features/scenarios/ScenarioEditor'
import { ActiveScenario } from '../../../src/features/scenarios/ScenarioSummary'
import { ScenarioActionDialog } from '../../../src/features/scenarios/ScenarioActionDialog'
import type { ScenarioAction } from '../../../src/features/scenarios/ScenarioActionDialog'
import {
  calculateScenarioProjection,
  compareProjectionWithRealized,
} from '../../../src/features/scenarios/calculations'
import './preview.css'

const products = [
  {
    id: 1,
    name: 'Brownie sintético A',
    salePrice: '12.00',
    type: 'finished_product',
    isActive: true,
  },
  {
    id: 2,
    name: 'Brownie sintético B',
    salePrice: '17.00',
    type: 'finished_product',
    isActive: true,
  },
]
const draft = {
  name: 'Meta sintética',
  description: 'Somente ensaio isolado',
  effectiveOn: '2026-10-01',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2288.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.70',
  feeTaxReserveRate: '0',
  mix: [
    {
      productId: 1,
      originalWeight: '0.33',
      plannedUnitPrice: '12.00',
      plannedUnitCost: '3.00',
    },
    {
      productId: 2,
      originalWeight: '0.70',
      plannedUnitPrice: '17.00',
      plannedUnitCost: '4.00',
    },
  ],
}
const projection = calculateScenarioProjection(draft, products)
const scenario = {
  ...draft,
  version: 2,
  feeTaxReserveBps: 0,
  projection,
  projectionMessage: '',
  paymentComparisonMessage: '',
  paymentComparisons: [],
  mix: draft.mix.map((row, index) => ({
    ...row,
    productName: requireDefined(products[index]).name,
    productType: 'finished_product',
    productIsActive: true,
  })),
}
function Preview() {
  const [open, setOpen] = useState(false),
    [form, setForm] = useState<ScenarioForm>({
      ...draft,
      salesDaysPerMonth: '20',
    }),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [action, setAction] = useState<ScenarioAction | null>(null),
    [calls, setCalls] = useState(0)
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <h1>Metas e cenários — ensaio isolado</h1>
      <button onClick={() => setOpen(true)}>Editar rascunho</button>
      <ActiveScenario
        scenario={scenario}
        realized={compareProjectionWithRealized(projection)}
        paymentFees={null}
      />
      <p role="status">Chamadas sintéticas: {calls}</p>
      {(['activate', 'archive', 'version'] as const).map((kind) => (
        <button className="m-3" key={kind} onClick={() => setAction(kind)}>
          {kind}
        </button>
      ))}
      {open ? (
        <OperationDialog
          title="Editar rascunho"
          pending={false}
          onClose={() => setOpen(false)}
        >
          {error ? <p role="alert">{error}</p> : null}
          <ScenarioEditor
            form={form}
            editing
            products={products}
            selectedProduct={selected}
            saving={false}
            onSubmit={(event) => {
              event.preventDefault()
              setError(
                'Conflito de revisão sintético. Recarregue antes de salvar.',
              )
            }}
            onChange={(field, value) =>
              setForm((current) => ({ ...current, [field]: value }))
            }
            onMixChange={(index, field, value) =>
              setForm((current) => ({
                ...current,
                mix: current.mix.map((row, i) =>
                  i === index ? { ...row, [field]: value } : row,
                ),
              }))
            }
            onSelectedProduct={setSelected}
            onAddProduct={() => {}}
            onRemoveProduct={(index) =>
              setForm((current) => ({
                ...current,
                mix: current.mix.filter((_, i) => i !== index),
              }))
            }
            onCancel={() => setOpen(false)}
          />
        </OperationDialog>
      ) : null}
      {action ? (
        <ScenarioActionDialog
          action={action}
          name={draft.name}
          version={2}
          activeName="Cenário anterior"
          onCancel={() => setAction(null)}
          onConfirm={async () => {
            setCalls((value) => value + 1)
            await new Promise((resolve) => setTimeout(resolve, 100))
            throw new Error('Conflito de revisão sintético')
          }}
        />
      ) : null}
    </main>
  )
}
createRoot(requireDefined(document.getElementById('root'))).render(<Preview />)
