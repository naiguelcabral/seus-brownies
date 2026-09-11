import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Box, ReceiptText, TrendingUp, Wallet } from 'lucide-react'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import {
  createOperationalReportCsv,
  downloadCsv,
} from '#/features/reports/csv-export'
import { getOperationalReports } from '#/features/reports/functions'
import { formatBrlMoney } from '#/lib/format-money'

const reportSearch = z.object({
  start: z.string().date().optional(),
  end: z.string().date().optional(),
})

export const Route = createFileRoute('/relatorios')({
  validateSearch: reportSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getOperationalReports({ data: deps }),
  component: ReportsPage,
  errorComponent: ReportsError,
})

function ReportsPage() {
  const report = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <ManagementLayout
      title="Relatórios"
      description="Indicadores calculados no servidor a partir de registros reais e valores históricos preservados."
    >
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#ecdfd4] bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void navigate({
            search: {
              start: String(form.get('start')),
              end: String(form.get('end')),
            },
          })
        }}
      >
        <label className="text-sm font-bold">
          De
          <input
            className="field mt-1.5 block"
            type="date"
            name="start"
            defaultValue={search.start ?? report.period.start}
          />
        </label>
        <label className="text-sm font-bold">
          Até
          <input
            className="field mt-1.5 block"
            type="date"
            name="end"
            defaultValue={search.end ?? report.period.end}
          />
        </label>
        <button className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white">
          Aplicar período
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#4a2114] px-4 py-2.5 text-sm font-bold text-[#4a2114]"
          onClick={() =>
            downloadCsv(
              `relatorio-operacional-${report.period.start}-a-${report.period.end}.csv`,
              createOperationalReportCsv(report),
            )
          }
        >
          Baixar CSV
        </button>
      </form>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={TrendingUp}
          title="Faturamento confirmado"
          value={formatBrlMoney(report.revenueTotal)}
        />
        <Metric
          icon={Wallet}
          title="Despesas"
          value={formatBrlMoney(report.expensesTotal)}
        />
        <Metric
          icon={Box}
          title="Estoque valorizado"
          value={formatBrlMoney(report.inventoryTotal)}
        />
        <Metric
          icon={ReceiptText}
          title="Itens em estoque"
          value={String(report.inventory.length)}
        />
        <Metric
          icon={ReceiptText}
          title="Unidades vendidas"
          value={quantity.format(Number(report.salesMetrics.total.units))}
        />
        <Metric
          icon={Wallet}
          title="Ticket médio por evento"
          value={
            report.salesMetrics.total.ticketAverage
              ? formatBrlMoney(report.salesMetrics.total.ticketAverage)
              : 'Sem dados'
          }
        />
        <Metric
          icon={TrendingUp}
          title="Preço médio por unidade"
          value={
            report.salesMetrics.total.averageUnitPrice
              ? formatBrlMoney(report.salesMetrics.total.averageUnitPrice)
              : 'Sem dados'
          }
        />
        <Metric
          icon={BarChart3}
          title="Divergência de receita"
          value={
            report.salesMetrics.total.audit.difference
              ? formatBrlMoney(report.salesMetrics.total.audit.difference)
              : 'Sem auditoria'
          }
        />
        {report.fifo ? (
          <Metric
            icon={TrendingUp}
            title="Margem bruta FIFO"
            value={formatBrlMoney(report.fifo.grossMargin)}
          />
        ) : null}
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
        <div className="border-b border-[#f0e5dc] px-5 py-4">
          <h2 className="font-bold">Locais e canais no período</h2>
          <p className="mt-1 text-xs text-[#846859]">
            Receita, volume, ticket e divergência calculados a partir das vendas
            confirmadas ou pagas. Auditoria disponível em{' '}
            {report.salesMetrics.total.audit.auditedEvents} de{' '}
            {report.salesMetrics.total.events} eventos.
          </p>
        </div>
        {report.salesMetrics.byLocation.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#fffaf5] text-xs uppercase text-[#896d5b]">
                <tr>
                  <th className="px-4 py-3">Local/canal</th>
                  <th className="px-4 py-3 text-right">Eventos</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Faturamento</th>
                  <th className="px-4 py-3 text-right">Ticket</th>
                  <th className="px-4 py-3 text-right">Divergência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e5dc]">
                {report.salesMetrics.byLocation.map((location) => (
                  <tr key={location.locationId ?? 'unassigned'}>
                    <td className="px-4 py-3 font-bold">
                      {location.locationName}
                    </td>
                    <td className="px-4 py-3 text-right">{location.events}</td>
                    <td className="px-4 py-3 text-right">
                      {quantity.format(Number(location.units))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatBrlMoney(location.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {location.ticketAverage
                        ? formatBrlMoney(location.ticketAverage)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {location.audit.difference
                        ? formatBrlMoney(location.audit.difference)
                        : 'Sem auditoria'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-[#846859]">
            Não há vendas confirmadas ou pagas no período.
          </p>
        )}
      </section>
      {report.managementSettings ? (
        <p className="mt-4 rounded-xl border border-[#ecdfd4] bg-white p-4 text-sm text-[#846859]">
          Meta de lucro cadastrada:{' '}
          <strong>
            {formatBrlMoney(report.managementSettings.monthlyProfitGoal)}
          </strong>
          . O progresso de lucro não é exibido enquanto competência, reversões e
          margem definitiva aguardam a decisão G2.
        </p>
      ) : null}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <List
          title="Faturamento por canal"
          rows={report.revenue.map((item) => [
            item.channel,
            formatBrlMoney(item.total),
          ])}
          empty="Não há vendas confirmadas ou pagas no período."
        />
        <List
          title="Despesas por categoria"
          rows={report.expensesByCategory.map((item) => [
            item.category,
            formatBrlMoney(item.total),
          ])}
          empty="Não há despesas no período."
        />
        <List
          title="Estoque e custo médio"
          rows={report.inventory
            .slice(0, 12)
            .map((item) => [
              `${item.productName} · ${quantity.format(Number(item.balance))} ${item.unit === 'unit' ? 'un.' : item.unit}`,
              formatBrlMoney(item.value),
            ])}
          empty="Não há saldo positivo até o fim do período."
        />
        <List
          title="Vendas por produto"
          rows={report.salesByProduct.map((item) => [
            `${item.productName} · ${quantity.format(Number(item.quantity))} un.`,
            formatBrlMoney(item.amount),
          ])}
          empty="Não há itens de venda no período."
        />
      </div>
      {report.fifo ? (
        <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#a64f23]" />
            <h2 className="font-bold">CMV e margem bruta FIFO</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Metric
              icon={TrendingUp}
              title="Receita líquida alocada"
              value={formatBrlMoney(report.fifo.netRevenue)}
            />
            <Metric
              icon={Box}
              title="CMV"
              value={formatBrlMoney(report.fifo.cogs)}
            />
            <Metric
              icon={Wallet}
              title="Margem bruta"
              value={formatBrlMoney(report.fifo.grossMargin)}
            />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <List
              title="Margem por produto"
              rows={report.fifo.byProduct.map((item) => [
                item.productName,
                formatBrlMoney(item.grossMargin),
              ])}
              empty="Não há alocações FIFO no período."
            />
            <List
              title="Margem por lote"
              rows={report.fifo.byBatch.map((item) => [
                `Lote #${item.productionBatchId}`,
                formatBrlMoney(item.grossMargin),
              ])}
              empty="Não há alocações FIFO no período."
            />
            <List
              title="Estoque FIFO remanescente"
              rows={report.fifo.inventory.map((item) => [
                `${item.productName} · ${quantity.format(Number(item.balance))} ${item.unit === 'unit' ? 'un.' : item.unit}`,
                formatBrlMoney(item.value),
              ])}
              empty="Não há camadas FIFO remanescentes."
            />
          </div>
        </section>
      ) : null}
      {report.reconciliation ? (
        <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-[#a64f23]" />
            <h2 className="font-bold">Reconciliação somente leitura</h2>
          </div>
          <p className="mt-2 text-sm text-[#846859]">
            {report.reconciliation.checked.layers} camadas,{' '}
            {report.reconciliation.checked.allocations} alocações,{' '}
            {report.reconciliation.checked.reversals} reversões e{' '}
            {report.reconciliation.checked.movements} movimentos verificados.
          </p>
          {report.reconciliation.divergences.length ? (
            <ul className="mt-4 space-y-2">
              {report.reconciliation.divergences.map((item) => (
                <li
                  key={`${item.code}-${item.entityType}-${item.entityId}`}
                  className="rounded-lg border border-[#e7c9b8] bg-[#fff5ed] p-3 text-sm"
                >
                  <strong>{item.code}</strong> · {item.entityType} #
                  {item.entityId} · esperado {item.expected}, encontrado{' '}
                  {item.actual} · relacionados {item.relatedIds.join(', ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg bg-[#eef8ed] p-3 text-sm text-[#315a31]">
              Nenhuma divergência encontrada nas relações FIFO verificadas.
            </p>
          )}
        </section>
      ) : null}
      <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-[#a64f23]" />
          <h2 className="font-bold">Produção, custos e perdas</h2>
        </div>
        {report.production ? (
          <div className="mt-4 grid gap-6 xl:grid-cols-2">
            <List
              title="Consumo de insumos"
              rows={report.production.consumptions.map((item) => [
                item.productName,
                `${quantity.format(Number(item.quantity))} · ${item.amount ? formatBrlMoney(item.amount) : 'custo não informado'}`,
              ])}
              empty="Nenhum consumo de lote concluído no período."
            />
            <List
              title="Perdas declaradas"
              rows={report.production.losses.map((item) => [
                item.productName,
                `${quantity.format(Number(item.quantity))} · ${item.reason ?? 'motivo pendente'}`,
              ])}
              empty="Nenhuma perda declarada no período."
            />
            <List
              title="Custos por lote"
              rows={report.production.batchCosts.map((item) => [
                `Lote #${item.id} · ${item.plannedFor ?? 'sem data'}`,
                item.amount
                  ? formatBrlMoney(item.amount)
                  : 'custo não informado',
              ])}
              empty="Nenhum custo de lote concluído no período."
            />
            <List
              title="Custos operacionais"
              rows={report.production.operationalCosts.map((item) => [
                item.type === 'energy' ? 'Energia' : 'Mão de obra',
                formatBrlMoney(item.amount),
              ])}
              empty="Nenhum custo operacional no período."
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#846859]">
            Esta seção será liberada quando as migrations de produção real forem
            aplicadas. Não há margem realizada por produto: o modelo ainda não
            vincula uma venda a um lote específico.
          </p>
        )}
      </section>
    </ManagementLayout>
  )
}

function ReportsError({ error }: { error: Error }) {
  return (
    <ManagementLayout
      title="Relatórios"
      description="Não foi possível carregar os indicadores solicitados."
    >
      <p className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        {error.message || 'Tente novamente em alguns instantes.'}
      </p>
    </ManagementLayout>
  )
}
function Metric({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof BarChart3
  title: string
  value: string
}) {
  return (
    <article className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <div className="flex justify-between">
        <p className="text-sm font-semibold text-[#846859]">{title}</p>
        <Icon size={18} className="text-[#a64f23]" />
      </div>
      <p className="mt-5 text-2xl font-bold">{value}</p>
    </article>
  )
}
function List({
  title,
  rows,
  empty,
}: {
  title: string
  rows: string[][]
  empty: string
}) {
  return (
    <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <h2 className="font-bold">{title}</h2>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-[#f0e5dc]">
          {rows.map(([label, value]) => (
            <li
              key={`${label}-${value}`}
              className="flex justify-between gap-4 py-2 text-sm"
            >
              <span>{label}</span>
              <strong className="text-right">{value}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-5 text-sm text-[#846859]">{empty}</p>
      )}
    </section>
  )
}
const quantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
