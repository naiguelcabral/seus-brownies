import { useState } from 'react'
import { calculatePixTarget } from '#/features/scenarios/payment-targets'
import type { ScenarioDraftInput } from '#/features/scenarios/contracts'
import type { PaymentFeeSchedule } from '#/features/finance/payment-fees'
import { formatBrlMoney } from '#/lib/format-money'

export function ScenarioPixTarget({
  draft,
  products,
  fees,
}: {
  draft: ScenarioDraftInput
  products: Parameters<typeof calculatePixTarget>[1]
  fees: PaymentFeeSchedule
}) {
  const [payments, setPayments] = useState('')
  let result: ReturnType<typeof calculatePixTarget> | null = null
  let error = ''
  if (payments) {
    try {
      result = calculatePixTarget(draft, products, fees, payments)
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Revise os pagamentos.'
    }
  }
  return (
    <section className="mt-4 rounded-xl border border-[#ecdfd4] p-4">
      <h3 className="font-bold">Meta com pagamentos Pix</h3>
      <label className="mt-2 block text-sm">
        Quantidade estimada de pagamentos no mês
        <input
          className="field mt-1 max-w-xs"
          inputMode="numeric"
          value={payments}
          placeholder="Informe para simular"
          onChange={(event) => setPayments(event.target.value)}
        />
      </label>
      <p className="mt-2 text-xs text-[#846859]">
        Um pagamento pode reunir vários produtos. A quantidade de unidades
        vendidas não define a quantidade de transações.
      </p>
      {error ? (
        <p role="status" className="mt-2 text-sm">
          {error}
        </p>
      ) : null}
      {result ? (
        <p className="mt-3 text-sm" role="status">
          Faturamento estimado:{' '}
          <strong>{formatBrlMoney(result.targetRevenue)}</strong> · taxas Pix:{' '}
          {formatBrlMoney(result.fee)} · lucro após custos e taxas:{' '}
          {formatBrlMoney(result.profit)}.
        </p>
      ) : null}
    </section>
  )
}
