import { z } from 'zod'
import {
  decimalCost,
  exactCost,
  subtractCosts,
  sumCosts,
  displayCostMoney,
} from '#/lib/exact-cost'
import type { ExactCost } from '#/lib/exact-cost'

export const expenseClassification = z.enum(['fixed', 'variable', 'production'])
export const expenseClassificationLabels = {
  fixed: 'Fixa — descontar do resultado',
  variable: 'Variável — descontar do resultado',
  production: 'Produção — já compõe o custo dos lotes',
} as const

export function calculateManagerialProfit(input: {
  netRevenue: string
  exactCogs: ExactCost
  reconciled: boolean
  expenses: Array<{ amount: string; classification: string | null }>
  receipts: Array<{ paymentFee: string | null }>
  goal: string
}) {
  const unknownExpenses = input.expenses.filter(
    (row) => !expenseClassification.safeParse(row.classification).success,
  ).length
  const unknownFees = input.receipts.filter(
    (row) => row.paymentFee === null,
  ).length
  const total = (kind: string) =>
    sumCosts(
      input.expenses
        .filter((row) => row.classification === kind)
        .map((row) => decimalCost(row.amount)),
    )
  const fixed = total('fixed'),
    variable = total('variable'),
    production = total('production')
  const fees = sumCosts(
    input.receipts.map((row) => decimalCost(row.paymentFee ?? '0')),
  )
  const profit = subtractCosts(
    subtractCosts(decimalCost(input.netRevenue), input.exactCogs),
    sumCosts([fixed, variable, fees]),
  )
  const available =
    input.reconciled && unknownExpenses === 0 && unknownFees === 0
  return {
    available,
    unknownExpenses,
    unknownFees,
    fixedExpenses: displayCostMoney(fixed),
    variableExpenses: displayCostMoney(variable),
    productionPayments: displayCostMoney(production),
    paymentFees: displayCostMoney(fees),
    managerialProfit: available ? displayCostMoney(profit) : null,
    remainingToGoal: available
      ? displayCostMoney(subtractCosts(decimalCost(input.goal), profit))
      : null,
    goal: displayCostMoney(decimalCost(input.goal)),
    // Preserve fractions until presentation, including fractional FIFO cents.
    exactProfit: available ? profit : exactCost(0n),
  }
}
