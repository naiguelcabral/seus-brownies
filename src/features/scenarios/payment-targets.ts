import { calculateScenarioProjection } from './calculations'
import type { ScenarioDraftInput } from './contracts'
import type { PaymentFeeSchedule } from '#/features/finance/payment-fees'
import { rateToTenThousandths } from '#/features/management/settings'
import { centsToMoney, moneyToCents } from '#/features/production/calculations'

export function calculatePaymentTargets(
  input: ScenarioDraftInput,
  products: Parameters<typeof calculateScenarioProjection>[1],
  fees: PaymentFeeSchedule,
) {
  const reserve = rateToTenThousandths(input.feeTaxReserveRate)
  if (reserve === null) throw new Error('Reserva inválida.')
  return [
    { method: 'Débito', bps: fees.debitBps },
    { method: 'Crédito', bps: fees.creditBps },
  ].map((row) => {
    const combined = reserve + BigInt(row.bps)
    if (combined > 10000n) throw new Error('Taxas e reserva excedem 100%.')
    const projection = calculateScenarioProjection(
      {
        ...input,
        feeTaxReserveRate: `${combined / 10000n}.${String(combined % 10000n).padStart(4, '0')}`,
      },
      products,
    )
    return {
      method: row.method,
      targetRevenue: projection.targetRevenue,
      units: projection.unitsPerMonth,
      profit: projection.projectedManagerialProfit,
      fee: projection.feeTaxReserve,
    }
  })
}

export function calculatePixTarget(
  input: ScenarioDraftInput,
  products: Parameters<typeof calculateScenarioProjection>[1],
  fees: PaymentFeeSchedule,
  transactions: string,
) {
  if (!/^\d{1,9}$/.test(transactions))
    throw new Error('Informe o número inteiro de pagamentos Pix no mês.')
  const fixedCosts = moneyToCents(input.fixedMonthlyCosts)
  if (fixedCosts === null) throw new Error('Custos fixos inválidos.')
  const pixFee = BigInt(transactions) * BigInt(fees.pixFixedCents)
  const projection = calculateScenarioProjection(
    { ...input, fixedMonthlyCosts: centsToMoney(fixedCosts + pixFee) },
    products,
  )
  return {
    targetRevenue: projection.targetRevenue,
    units: projection.unitsPerMonth,
    profit: projection.projectedManagerialProfit,
    fee: centsToMoney(pixFee),
  }
}
