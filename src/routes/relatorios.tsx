import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Box, ReceiptText, TrendingUp, Wallet } from 'lucide-react'
import { z } from 'zod'

import { ManagementLayout } from '#/components/ManagementLayout'
import { getOperationalReports } from '#/features/reports/functions'

const reportSearch = z.object({ start: z.string().date().optional(), end: z.string().date().optional() })

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
  return <ManagementLayout title="Relatórios" description="Indicadores calculados no servidor a partir de registros reais e valores históricos preservados.">
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#ecdfd4] bg-white p-5" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void navigate({ search: { start: String(form.get('start')), end: String(form.get('end')) } }) }}>
      <label className="text-sm font-bold">De<input className="field mt-1.5 block" type="date" name="start" defaultValue={search.start ?? report.period.start} /></label>
      <label className="text-sm font-bold">Até<input className="field mt-1.5 block" type="date" name="end" defaultValue={search.end ?? report.period.end} /></label>
      <button className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white">Aplicar período</button>
    </form>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={TrendingUp} title="Faturamento confirmado" value={money.format(Number(report.revenueTotal))} />
      <Metric icon={Wallet} title="Despesas" value={money.format(Number(report.expensesTotal))} />
      <Metric icon={Box} title="Estoque valorizado" value={money.format(Number(report.inventoryTotal))} />
      <Metric icon={ReceiptText} title="Itens em estoque" value={String(report.inventory.length)} />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <List title="Faturamento por canal" rows={report.revenue.map((item) => [item.channel, money.format(Number(item.total))])} empty="Não há vendas confirmadas ou pagas no período." />
      <List title="Despesas por categoria" rows={report.expensesByCategory.map((item) => [item.category, money.format(Number(item.total))])} empty="Não há despesas no período." />
      <List title="Estoque e custo médio" rows={report.inventory.slice(0, 12).map((item) => [`${item.productName} · ${quantity.format(Number(item.balance))} ${item.unit === 'unit' ? 'un.' : item.unit}`, money.format(Number(item.value))])} empty="Não há saldo positivo até o fim do período." />
      <List title="Vendas por produto" rows={report.salesByProduct.map((item) => [`${item.productName} · ${quantity.format(Number(item.quantity))} un.`, money.format(Number(item.amount))])} empty="Não há itens de venda no período." />
    </div>
    <section className="mt-6 rounded-2xl border border-[#ecdfd4] bg-white p-5"><div className="flex items-center gap-2"><BarChart3 size={18} className="text-[#a64f23]" /><h2 className="font-bold">Produção, custos e perdas</h2></div>{report.production ? <div className="mt-4 grid gap-6 xl:grid-cols-2"><List title="Consumo de insumos" rows={report.production.consumptions.map((item) => [item.productName, `${quantity.format(Number(item.quantity))} · ${item.amount ? money.format(Number(item.amount)) : 'custo não informado'}`])} empty="Nenhum consumo de lote concluído no período." /><List title="Perdas declaradas" rows={report.production.losses.map((item) => [item.productName, `${quantity.format(Number(item.quantity))} · ${item.reason ?? 'motivo pendente'}`])} empty="Nenhuma perda declarada no período." /><List title="Custos por lote" rows={report.production.batchCosts.map((item) => [`Lote #${item.id} · ${item.plannedFor ?? 'sem data'}`, item.amount ? money.format(Number(item.amount)) : 'custo não informado'])} empty="Nenhum custo de lote concluído no período." /><List title="Custos operacionais" rows={report.production.operationalCosts.map((item) => [item.type === 'energy' ? 'Energia' : 'Mão de obra', money.format(Number(item.amount))])} empty="Nenhum custo operacional no período." /></div> : <p className="mt-3 text-sm text-[#846859]">Esta seção será liberada quando as migrations de produção real forem aplicadas. Não há margem realizada por produto: o modelo ainda não vincula uma venda a um lote específico.</p>}</section>
  </ManagementLayout>
}

function ReportsError({ error }: { error: Error }) { return <ManagementLayout title="Relatórios" description="Não foi possível carregar os indicadores solicitados."><p className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">{error.message || 'Tente novamente em alguns instantes.'}</p></ManagementLayout> }
function Metric({ icon: Icon, title, value }: { icon: typeof BarChart3; title: string; value: string }) { return <article className="rounded-2xl border border-[#ecdfd4] bg-white p-5"><div className="flex justify-between"><p className="text-sm font-semibold text-[#846859]">{title}</p><Icon size={18} className="text-[#a64f23]" /></div><p className="mt-5 text-2xl font-bold">{value}</p></article> }
function List({ title, rows, empty }: { title: string; rows: string[][]; empty: string }) { return <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5"><h2 className="font-bold">{title}</h2>{rows.length ? <ul className="mt-3 divide-y divide-[#f0e5dc]">{rows.map(([label, value]) => <li key={`${label}-${value}`} className="flex justify-between gap-4 py-2 text-sm"><span>{label}</span><strong className="text-right">{value}</strong></li>)}</ul> : <p className="py-5 text-sm text-[#846859]">{empty}</p>}</section> }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const quantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
