import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { OperationDialog } from '../../../src/components/OperationDialog'
import { SettlementPreview } from '../../../src/components/SettlementPreview'
import { ProfitSummary } from '../../../src/components/ProfitSummary'
import { calculateManagerialProfit } from '../../../src/features/finance/managerial-profit'
import { decimalCost } from '../../../src/lib/exact-cost'
import '../catalog-editors/preview.css'

const fees = {
  debitBps: 143,
  creditBps: 336,
  pixFixedCents: 49,
  effectiveOn: '2026-10-18',
}
function Preview() {
  const [open, setOpen] = useState(false),
    [amount, setAmount] = useState('30.00'),
    [method, setMethod] = useState('pix')
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <h1>Ensaio sem operações reais</h1>
      <button onClick={() => setOpen(true)}>Registrar venda</button>
      {open ? (
        <OperationDialog
          title="Registrar venda"
          pending={false}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4 p-4">
            <label>
              Valor bruto
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Meio
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
              </select>
            </label>
            <SettlementPreview
              method={method}
              amount={amount}
              date="2026-10-18"
              fees={fees}
            />
          </div>
        </OperationDialog>
      ) : null}
      <ProfitSummary
        data={{
          ...calculateManagerialProfit({
            netRevenue: '1000',
            exactCogs: decimalCost('400'),
            reconciled: true,
            expenses: [
              { amount: '150', classification: 'production' },
              { amount: '88', classification: 'fixed' },
            ],
            receipts: [{ paymentFee: '0.49' }],
            goal: '10000',
          }),
          netRevenue: '1000',
          cogs: '400',
          fixedBudget: '2288',
        }}
      />
    </main>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing root')
createRoot(root).render(<Preview />)
