import type { loadManagerialOverview } from '#/features/finance/functions'
import { formatBrlMoney } from '#/lib/format-money'

export function ProfitSummary({
  data,
}: {
  data: Awaited<ReturnType<typeof loadManagerialOverview>>
}) {
  return (
    <section
      aria-label="Lucro e meta conjunta"
      className="rounded-2xl border border-[#ecdfd4] bg-white p-5"
    >
      <h2 className="text-lg font-bold">Resultado de todos os produtos</h2>
      <p className="mt-1 text-sm text-[#846859]">
        Receita das entregas menos CMV FIFO, taxas de pagamento e despesas
        classificadas. Todas as vendas contam, independentemente do mix
        planejado.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Lucro registrado', data.managerialProfit],
          ['Meta mensal de lucro', data.goal],
          ['Falta para a meta', data.remainingToGoal],
          ['Taxas dos pagamentos', data.paymentFees],
          ['Despesas fixas registradas', data.fixedExpenses],
          ['Despesas variáveis registradas', data.variableExpenses],
          ['Receita líquida das entregas', data.netRevenue],
          ['CMV FIFO', data.cogs],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#faf6f1] p-3">
            <dt className="text-xs text-[#846859]">{label}</dt>
            <dd className="mt-1 font-bold">
              {value == null ? 'A conferir' : formatBrlMoney(value)}
            </dd>
          </div>
        ))}
      </dl>
      {!data.available ? (
        <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
          Resultado incompleto: confira cobertura FIFO, {data.unknownExpenses}{' '}
          despesas sem classificação e {data.unknownFees} recebimentos sem taxa
          informada. Não substituímos dados ausentes por zero.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-[#846859]">
        O orçamento fixo de{' '}
        {data.fixedBudget
          ? formatBrlMoney(data.fixedBudget)
          : 'valor não cadastrado'}{' '}
        é planejamento, sem desconto automático no realizado. Pagamentos de
        produção já incorporados aos lotes:{' '}
        {formatBrlMoney(data.productionPayments)}, sem descontar novamente. O
        lucro registrado depende da completude dos lançamentos.
      </p>
    </section>
  )
}
