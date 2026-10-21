import { requireDefined } from '#/lib/required-value'
import { formatBrlMoney } from '#/lib/format-money'
import type {
  ScenarioProjection,
  ScenarioRealizedComparison,
} from './calculations'
import type { PaymentFeeSchedule } from '#/features/finance/payment-fees'
import type { calculatePaymentTargets } from './payment-targets'
import { ScenarioPixTarget } from '#/components/ScenarioPixTarget'
import type { listScenarios } from './functions'

type ScenarioSnapshot = NonNullable<
  Awaited<ReturnType<typeof listScenarios>>['activeScenario']
>
export function ActiveScenario({
  scenario,
  realized,
  paymentFees,
}: {
  paymentFees: PaymentFeeSchedule | null
  scenario:
    | (Pick<
        ScenarioSnapshot,
        | 'name'
        | 'version'
        | 'effectiveOn'
        | 'monthlyProfitGoal'
        | 'fixedMonthlyCosts'
        | 'feeTaxReserveBps'
        | 'projection'
        | 'projectionMessage'
        | 'paymentComparisonMessage'
        | 'paymentComparisons'
        | 'description'
        | 'salesDaysPerMonth'
        | 'weeksPerMonth'
        | 'minimumMarginRate'
        | 'feeTaxReserveRate'
      > & {
        mix: Pick<
          ScenarioSnapshot['mix'][number],
          | 'productId'
          | 'originalWeight'
          | 'plannedUnitPrice'
          | 'plannedUnitCost'
          | 'productName'
          | 'productType'
          | 'productIsActive'
        >[]
      })
    | null
  realized: ScenarioRealizedComparison | null
}) {
  if (!scenario)
    return (
      <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <h2 className="font-bold">Versão ativa</h2>
        <p className="mt-2 text-sm text-[#846859]">
          Nenhum cenário está ativo. Crie um rascunho e valide todas as
          premissas antes da ativação.
        </p>
      </section>
    )

  const projection = scenario.projection
  return (
    <section className="rounded-2xl border border-[#dec7b6] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#a64f23]">
            Meta · premissas · projeção
          </p>
          <h2 className="mt-1 text-xl font-black">
            {scenario.name} · versão {scenario.version}
          </h2>
          <p className="mt-1 text-sm text-[#846859]">
            Vigência {scenario.effectiveOn}. Estes valores são estimativas, não
            resultados realizados.
          </p>
        </div>
        <span className="rounded-full bg-[#f7e3ce] px-3 py-1 text-xs font-bold text-[#75411f]">
          Cenário ativo
        </span>
      </div>

      {projection ? (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Meta de lucro mensal após custos"
              value={formatBrlMoney(scenario.monthlyProfitGoal)}
            />
            <Metric
              label="Custos fixos mensais planejados"
              value={formatBrlMoney(scenario.fixedMonthlyCosts)}
            />
            <Metric
              label={
                scenario.feeTaxReserveBps === 0
                  ? 'Faturamento-alvo antes das taxas de pagamento'
                  : 'Faturamento-alvo com reserva planejada'
              }
              value={formatBrlMoney(projection.targetRevenue)}
            />
            <Metric
              label={
                scenario.feeTaxReserveBps === 0
                  ? 'Lucro projetado antes das taxas de pagamento'
                  : 'Lucro gerencial projetado'
              }
              value={formatBrlMoney(projection.projectedManagerialProfit)}
            />
          </dl>
          <p className="mt-3 text-sm text-[#846859]">
            Meta conjunta de todas as vendas. As estimativas por produto
            orientam o planejamento, sem criar cotas obrigatórias.
          </p>
          <details className="mt-4 rounded-xl border border-[#ecdfd4] p-4">
            <summary className="cursor-pointer font-bold">
              Premissas e volume estimado
            </summary>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Margem necessária antes dos custos fixos"
                value={formatBrlMoney(projection.marginNeededBeforeFixedCosts)}
              />
              <Metric
                label="Margem gerada pelo mix"
                value={formatBrlMoney(projection.mixGeneratedProfit)}
              />
              <Metric
                label="Folga ou diferença para a meta"
                value={formatBrlMoney(projection.gapToTarget)}
              />
              <Metric
                label="Unidades estimadas no mês"
                value={projection.unitsPerMonth}
              />
              <Metric
                label="Unidades estimadas na semana"
                value={projection.unitsPerWeek}
              />
              <Metric
                label="Ticket médio-alvo por unidade planejada"
                value={
                  projection.targetAverageTicket
                    ? formatBrlMoney(projection.targetAverageTicket)
                    : 'Dado ausente'
                }
              />
              <Metric
                label="Dias de venda no mês"
                value={String(scenario.salesDaysPerMonth)}
              />
              <Metric
                label="Reserva projetada"
                value={formatBrlMoney(projection.feeTaxReserve)}
              />
            </dl>
            <p className="mt-3 text-xs text-[#846859]">
              Mix informado: {formatRate(projection.originalMixTotal)}. Mix
              utilizado: 100,00%, com ajuste proporcional e preservação dos
              pesos originais.
            </p>
          </details>
          {scenario.paymentComparisonMessage ? (
            <p className="mt-3 text-sm" role="status">
              Comparação por meio indisponível:{' '}
              {scenario.paymentComparisonMessage}
            </p>
          ) : null}
          {scenario.paymentComparisons.length > 0 ? (
            <div className="mt-4 rounded-xl border border-[#ecdfd4] p-4">
              <h3 className="font-bold">
                Meta após taxas: comparar meios separadamente
              </h3>
              <p className="mt-2 text-xs text-[#846859]">
                Cada linha calcula o faturamento necessário se todas as vendas
                usassem aquele meio. Não presume combinação real por local. Pix
                depende do número de transações, disponível no simulador.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr>
                      <th>Meio</th>
                      <th>Faturamento necessário</th>
                      <th>Taxas e reserva</th>
                      <th>Lucro após custos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.paymentComparisons.map(
                      (
                        row: ReturnType<typeof calculatePaymentTargets>[number],
                      ) => (
                        <tr key={row.method}>
                          <td className="py-2">{row.method}</td>
                          <td>{formatBrlMoney(row.targetRevenue)}</td>
                          <td>{formatBrlMoney(row.fee)}</td>
                          <td>{formatBrlMoney(row.profit)}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {paymentFees ? (
            <details className="mt-4 rounded-xl border border-[#ecdfd4] p-4">
              <summary className="cursor-pointer font-bold">
                Simular a meta com Pix
              </summary>
              <ScenarioPixTarget
                fees={paymentFees}
                draft={{
                  name: scenario.name,
                  description: scenario.description ?? undefined,
                  effectiveOn: scenario.effectiveOn,
                  monthlyProfitGoal: scenario.monthlyProfitGoal,
                  fixedMonthlyCosts: scenario.fixedMonthlyCosts,
                  salesDaysPerMonth: scenario.salesDaysPerMonth,
                  weeksPerMonth: scenario.weeksPerMonth,
                  minimumMarginRate: scenario.minimumMarginRate,
                  feeTaxReserveRate: scenario.feeTaxReserveRate,
                  mix: scenario.mix.map(
                    (row: {
                      productId: number
                      originalWeight: string
                      plannedUnitPrice: string
                      plannedUnitCost: string
                    }) => ({
                      productId: row.productId,
                      originalWeight: row.originalWeight,
                      plannedUnitPrice: row.plannedUnitPrice,
                      plannedUnitCost: row.plannedUnitCost,
                    }),
                  ),
                }}
                products={scenario.mix.map(
                  (row: {
                    productId: number
                    productName: string
                    productType: string
                    productIsActive: boolean
                  }) => ({
                    id: row.productId,
                    name: row.productName,
                    type: row.productType,
                    isActive: row.productIsActive,
                  }),
                )}
              />
            </details>
          ) : null}
          <details className="mt-4 rounded-xl border border-[#ecdfd4] p-4">
            <summary className="cursor-pointer font-bold">
              Mix e estimativas por produto
            </summary>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[#4a2114] text-white">
                  <tr>
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2">Mix orientativo</th>
                    <th className="px-3 py-2">Estimativa mês</th>
                    <th className="px-3 py-2">Estimativa semana</th>
                    <th className="px-3 py-2">Faturamento projetado</th>
                    <th className="px-3 py-2">Margem projetada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e5dc]">
                  {projection.productLines.map(
                    (line: ScenarioProjection['productLines'][number]) => (
                      <tr key={line.productId}>
                        <td className="px-3 py-2 font-bold">
                          {line.productName}
                          {line.belowMinimumMargin ? (
                            <span className="ml-2 text-xs text-[#a63c23]">
                              abaixo da margem mínima
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {formatBps(line.normalizedWeightBps)}
                        </td>
                        <td className="px-3 py-2">{line.quantityPerMonth}</td>
                        <td className="px-3 py-2">{line.quantityPerWeek}</td>
                        <td className="px-3 py-2">
                          {formatBrlMoney(line.projectedRevenue)}
                        </td>
                        <td className="px-3 py-2">
                          {formatBrlMoney(line.projectedMargin)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]">
          Premissa pendente: {scenario.projectionMessage}
        </p>
      )}

      <div className="mt-6 border-t border-[#eadbd0] pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#35615d]">
          Resultado realizado
        </p>
        {!realized || realized.status === 'missing' ? (
          <div className="mt-2 rounded-lg border border-dashed border-[#c7b8aa] p-4 text-sm text-[#735d50]">
            <p>Dado ausente para o período de vigência.</p>
            <p className="mt-1">
              Consulte o lucro registrado em Financeiro ou na Visão geral, com
              taxas e despesas classificadas.
            </p>
          </div>
        ) : (
          <>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Receita líquida realizada"
                value={formatBrlMoney(realized.netRevenue)}
              />
              <Metric
                label="CMV FIFO realizado"
                value={formatBrlMoney(realized.cogs)}
              />
              <Metric
                label="Margem bruta realizada"
                value={formatBrlMoney(realized.grossMargin)}
              />
            </dl>
            <p className="mt-3 text-xs text-[#846859]">
              O lucro conjunto, após taxas e despesas classificadas, está
              disponível em Financeiro e na Visão geral. Este quadro compara
              receita e CMV pelas datas do cenário.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-bold">
                Comparar produtos com o realizado
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wide text-[#35615d]">
                    Comparação futura: planejado versus realizado por produto
                  </caption>
                  <thead className="bg-[#f3ece6] text-[#573524]">
                    <tr>
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">Receita planejada</th>
                      <th className="px-3 py-2">Receita realizada</th>
                      <th className="px-3 py-2">Margem planejada</th>
                      <th className="px-3 py-2">Margem realizada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e5dc]">
                    {realized.productLines.map((line) => (
                      <tr key={line.productId}>
                        <td className="px-3 py-2 font-bold">
                          {line.productName}
                        </td>
                        <td className="px-3 py-2">
                          {formatBrlMoney(line.plannedRevenue)}
                        </td>
                        <td className="px-3 py-2">
                          {line.realizedRevenue === null
                            ? 'Dado ausente'
                            : formatBrlMoney(line.realizedRevenue)}
                        </td>
                        <td className="px-3 py-2">
                          {formatBrlMoney(line.plannedMargin)}
                        </td>
                        <td className="px-3 py-2">
                          {line.realizedMargin === null
                            ? 'Dado ausente'
                            : formatBrlMoney(line.realizedMargin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8f4ee] p-3">
      <dt className="text-xs font-bold text-[#846859]">{label}</dt>
      <dd className="mt-1 text-lg font-black text-[#4a2114]">{value}</dd>
    </div>
  )
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

export function formatBps(value: number) {
  const bps = BigInt(value)
  return `${bps / 100n},${String(bps % 100n).padStart(2, '0')}%`
}

export function formatRate(value: string) {
  const normalized = value.replace(',', '.')
  const [whole, fraction = ''] = normalized.split('.')
  const millionths =
    BigInt(requireDefined(whole)) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
  const hundredthsOfPercent = (millionths + 50n) / 100n
  return `${hundredthsOfPercent / 100n},${String(hundredthsOfPercent % 100n).padStart(2, '0')}%`
}
