import { useState } from 'react'
import { estimatePaymentFees } from '#/features/finance/payment-fees'
import type { PaymentFeeSchedule } from '#/features/finance/payment-fees'
import { formatBrlMoney } from '#/lib/format-money'

export function PaymentFeeCalculator({
  schedule,
  initialRevenue = '100.00',
}: {
  schedule: PaymentFeeSchedule | null
  initialRevenue?: string
}) {
  const [revenue, setRevenue] = useState(initialRevenue)
  const [transactions, setTransactions] = useState('1')
  if (!schedule)
    return (
      <p className="text-sm">Cadastre as taxas por pagamento em Parâmetros.</p>
    )
  let rows: ReturnType<typeof estimatePaymentFees> = []
  let error = ''
  try {
    rows = estimatePaymentFees(schedule, revenue, transactions)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Revise os valores.'
  }
  return (
    <section className="my-5 rounded-xl border border-[#ecdfd4] bg-[#fffaf5] p-4">
      <h3 className="font-bold text-[#4a2114]">Comparar taxas por pagamento</h3>
      <p className="my-2 text-sm text-[#846859]">
        Débito {schedule.debitBps / 100}%, crédito {schedule.creditBps / 100}%,
        Pix {formatBrlMoney(String(schedule.pixFixedCents / 100))} por
        transação. Vigência: {schedule.effectiveOn}. Cada linha considera um
        meio separado; não há média presumida.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Valor vendido (R$)
          <input
            className="field mt-1"
            inputMode="decimal"
            value={revenue}
            onChange={(event) => setRevenue(event.target.value)}
          />
        </label>
        <label className="text-sm font-bold">
          Quantidade de pagamentos Pix
          <input
            className="field mt-1"
            inputMode="numeric"
            value={transactions}
            onChange={(event) => setTransactions(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p role="status" className="mt-3 text-sm">
          {error}
        </p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr>
              <th>Meio</th>
              <th>Taxa estimada</th>
              <th>Recebimento após taxa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.method}>
                <td className="py-2">{row.method}</td>
                <td>{formatBrlMoney(row.fee)}</td>
                <td>{formatBrlMoney(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-xs text-[#846859]">
        Estimativa com arredondamento para centavos. Pagamentos com vários
        produtos contam como uma transação. Não registra recebimentos ou
        despesas.
      </p>
    </section>
  )
}
