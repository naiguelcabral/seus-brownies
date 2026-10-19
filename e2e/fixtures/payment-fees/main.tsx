import { createRoot } from 'react-dom/client'
import { PaymentFeeCalculator } from '../../../src/components/PaymentFeeCalculator'
import { ScenarioPixTarget } from '../../../src/components/ScenarioPixTarget'
import '../catalog-editors/preview.css'

const fees = {
  debitBps: 143,
  creditBps: 336,
  pixFixedCents: 49,
  effectiveOn: '2026-10-18',
}
const draft = {
  name: 'Meta conjunta',
  effectiveOn: '2026-10-18',
  monthlyProfitGoal: '10000.00',
  fixedMonthlyCosts: '2288.00',
  salesDaysPerMonth: 20,
  weeksPerMonth: '4.00',
  minimumMarginRate: '0.7000',
  feeTaxReserveRate: '0.0000',
  mix: [
    {
      productId: 1,
      originalWeight: '1',
      plannedUnitPrice: '10.00',
      plannedUnitCost: '2.000',
    },
  ],
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing preview root')
createRoot(root).render(
  <main className="mx-auto max-w-4xl p-4">
    <h1>Ensaio local das taxas</h1>
    <PaymentFeeCalculator schedule={fees} />
    <ScenarioPixTarget
      draft={draft}
      fees={fees}
      products={[
        { id: 1, name: 'Brownie', type: 'finished_product', isActive: true },
      ]}
    />
  </main>,
)
