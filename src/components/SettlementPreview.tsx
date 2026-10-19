import {
  calculateSettlement,
  paymentMethod,
} from '#/features/finance/settlement'
import type { PaymentFeeSchedule } from '#/features/finance/payment-fees'
import { formatBrlMoney } from '#/lib/format-money'

export function SettlementPreview({
  method,
  amount,
  date,
  fees,
}: {
  method: string
  amount: string
  date: string
  fees: PaymentFeeSchedule | null
}) {
  if (!paymentMethod.safeParse(method).success || !amount) return null
  try {
    const result = calculateSettlement(
      paymentMethod.parse(method),
      amount,
      date,
      fees,
    )
    return (
      <p role="status" className="rounded-lg bg-[#fff5e7] p-3 text-sm">
        Bruto {formatBrlMoney(result.gross)} · taxa {formatBrlMoney(result.fee)}{' '}
        · líquido a receber {formatBrlMoney(result.net)}. Um pagamento para
        todos os itens desta venda.
      </p>
    )
  } catch (error) {
    return (
      <p role="status" className="text-sm text-red-700">
        {error instanceof Error ? error.message : 'Confira o pagamento.'}
      </p>
    )
  }
}
