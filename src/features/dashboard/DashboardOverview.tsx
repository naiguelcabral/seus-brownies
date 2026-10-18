import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CookingPot,
  Package,
  RefreshCw,
  ReceiptText,
  ShoppingBag,
  TriangleAlert,
  Wallet,
  ChartNoAxesCombined,
  Target,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { hasPermission } from '../auth/authorization'
import type { AppRole } from '../auth/authorization'
import { formatBrlMoney } from '../../lib/format-money'
import { formatDateOnly, formatDateTime } from '../../lib/format'

export type DashboardSnapshot = {
  generatedAt: string
  period: { start: string; end: string }
  activeProducts: number
  productsWithStock: number
  monthExpenses: string
  lowStock: Array<{
    id: number
    name: string
    unit: string
    balance: string
    reorderPoint: string | null
  }>
  recentPurchases: Array<{
    id: number
    supplierName: string | null
    purchasedAt: string
    totalAmount: string
  }>
  recentSales: Array<{
    id: number
    customerName: string | null
    soldAt: string | Date
    status: 'draft' | 'confirmed' | 'paid' | 'cancelled'
    totalAmount: string
  }>
}

const actions = [
  {
    to: '/vendas',
    title: 'Registrar venda',
    detail: 'Clientes, itens e pagamento',
    icon: ShoppingBag,
    permission: 'sales:write',
  },
  {
    to: '/compras',
    title: 'Registrar compra',
    detail: 'Entrada de insumos e embalagens',
    icon: ReceiptText,
    permission: 'purchases:write',
  },
  {
    to: '/producao',
    title: 'Abrir produção',
    detail: 'Receitas, lotes e conclusão',
    icon: CookingPot,
    permission: 'production:read',
  },
  {
    to: '/despesas',
    title: 'Lançar despesa',
    detail: 'Organize os gastos da operação',
    icon: Wallet,
    permission: 'expenses:write',
  },
  {
    to: '/relatorios',
    title: 'Ver relatórios',
    detail: 'Resultados e análise por período',
    icon: ChartNoAxesCombined,
    permission: 'reports:financial:read',
  },
  {
    to: '/cenarios',
    title: 'Revisar metas',
    detail: 'Premissas e cenários planejados',
    icon: Target,
    permission: 'scenarios:read',
  },
] as const

export function DashboardOverview({
  data,
  role,
  refreshing,
  refreshError,
  onRefresh,
}: {
  data: DashboardSnapshot
  role: AppRole | null | undefined
  refreshing: boolean
  refreshError: string | null
  onRefresh: () => void
}) {
  const month = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(`${data.period.start}T12:00:00Z`))
  return (
    <div className="space-y-6">
      <section
        aria-label="Resumo do painel"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#4a2114] p-5 text-white sm:p-6"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#f7bc76]">
            Painel da operação
          </p>
          <h2 className="mt-2 text-xl font-bold">
            O essencial para cuidar dos Seus Brownies
          </h2>
          <p className="mt-2 text-sm text-[#f2dccc]">
            Estoque atual e despesas de {month}.
          </p>
          <p className="mt-2 text-xs text-[#f2dccc]">
            Atualizado em {formatDateTime(data.generatedAt)} · horário de
            Brasília
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw size={16} aria-hidden="true" />
          {refreshing ? 'Atualizando…' : 'Atualizar painel'}
        </button>
      </section>
      {refreshError ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {refreshError}
        </p>
      ) : null}
      <section
        aria-label="Indicadores principais"
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <Metric
          title="Produtos ativos"
          value={String(data.activeProducts)}
          detail="Itens disponíveis no catálogo"
          to="/produtos"
          icon={Package}
        />
        <Metric
          title="Itens com saldo"
          value={String(data.productsWithStock)}
          detail="Produtos com estoque positivo"
          to="/estoque"
          icon={Boxes}
        />
        <Metric
          title="Precisam de reposição"
          value={String(data.lowStock.length)}
          detail={
            data.lowStock.length
              ? 'Confira os limites no estoque'
              : 'Nenhum item no limite de reposição'
          }
          to="/estoque"
          icon={TriangleAlert}
          warning={data.lowStock.length > 0}
        />
        <Metric
          title="Despesas do mês"
          value={formatBrlMoney(data.monthExpenses)}
          detail={month}
          to="/despesas"
          icon={Wallet}
        />
      </section>
      {!data.recentPurchases.length && !data.recentSales.length ? (
        <section className="rounded-2xl border border-[#e6d5c4] bg-[#fff8ee] p-5">
          <h2 className="font-bold">Comece pelos registros da operação</h2>
          <p className="mt-2 text-sm leading-6 text-[#846859]">
            Ainda não há compras ou vendas registradas. Confira o catálogo,
            registre as compras reais e prepare a produção antes de vender com
            baixa de estoque.
          </p>
          <Link
            to="/produtos"
            search={{ page: 1 }}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#75411f]"
          >
            Conferir produtos <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="stock-attention-title"
          className="overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e5dc] p-5">
            <div>
              <h2 id="stock-attention-title" className="font-bold">
                O que precisa de atenção
              </h2>
              <p className="mt-1 text-sm text-[#846859]">
                Reposição de estoque
              </p>
            </div>
            <Link
              to="/estoque"
              search={{ page: 1, movementPage: 1 }}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#75411f]"
            >
              Ver estoque <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {data.lowStock.length ? (
            <>
              <p className="px-5 pt-4 text-sm text-[#846859]">
                {data.lowStock.length}{' '}
                {data.lowStock.length === 1
                  ? 'item atingiu'
                  : 'itens atingiram'}{' '}
                o limite de reposição. Confira o saldo antes da próxima
                produção.
              </p>
              <ul className="divide-y divide-[#f0e5dc] px-5">
                {data.lowStock.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-[#896d5b]">
                        Limite:{' '}
                        {formatQuantity(item.reorderPoint ?? '0', item.unit)}
                      </p>
                    </div>
                    <span className="rounded-lg bg-[#fff0e3] px-3 py-1.5 text-sm font-bold text-[#9e481e]">
                      Saldo: {formatQuantity(item.balance, item.unit)}
                    </span>
                  </li>
                ))}
              </ul>
              {data.lowStock.length > 5 ? (
                <p className="border-t border-[#f0e5dc] px-5 py-3 text-xs text-[#846859]">
                  Exibindo 5 de {data.lowStock.length} itens. Consulte a lista
                  completa no estoque.
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex items-start gap-3 p-5">
              <CheckCircle2
                className="shrink-0 text-emerald-700"
                size={22}
                aria-hidden="true"
              />
              <div>
                <p className="font-bold text-emerald-800">
                  Nenhum alerta de reposição
                </p>
                <p className="mt-1 text-sm leading-6 text-[#846859]">
                  Os saldos estão acima dos limites cadastrados. Revise esses
                  limites conforme sua rotina.
                </p>
              </div>
            </div>
          )}
        </section>
        <section
          aria-labelledby="dashboard-actions-title"
          className="rounded-2xl border border-[#ecdfd4] bg-white p-5"
        >
          <h2 id="dashboard-actions-title" className="font-bold">
            Ações rápidas
          </h2>
          <p className="mt-1 text-sm text-[#846859]">
            Abra a tarefa que você precisa fazer.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {actions
              .filter(
                (action) => role && hasPermission(role, action.permission),
              )
              .map(({ to, title, detail, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group rounded-xl border border-[#eadbce] p-3 sm:p-4 text-[#573524] no-underline transition hover:border-[#b8673b] hover:bg-[#fff8f2]"
                >
                  <Icon
                    size={19}
                    className="text-[#a64f23]"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-bold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#846859]">
                    {detail}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      </div>
      <section aria-labelledby="recent-records-title">
        <div className="mb-4">
          <h2 id="recent-records-title" className="text-lg font-bold">
            Últimos registros
          </h2>
          <p className="mt-1 text-sm text-[#846859]">
            Até cinco registros de cada tipo, independentemente do mês. Vendas
            em rascunho ou canceladas não representam receita realizada.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RecordList
            title="Compras recentes"
            to="/compras"
            empty="Nenhuma compra registrada. Use Registrar compra quando houver uma compra real."
            hasRecords={data.recentPurchases.length > 0}
          >
            {data.recentPurchases.map((purchase) => (
              <li
                key={purchase.id}
                className="flex items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold">
                    {purchase.supplierName || 'Fornecedor não informado'}
                  </p>
                  <p className="mt-1 text-xs text-[#896d5b]">
                    Compra #{purchase.id} ·{' '}
                    {formatDateOnly(purchase.purchasedAt)}
                  </p>
                </div>
                <strong className="shrink-0 text-sm">
                  {formatBrlMoney(purchase.totalAmount)}
                </strong>
              </li>
            ))}
          </RecordList>
          <RecordList
            title="Vendas recentes"
            to="/vendas"
            empty="Nenhuma venda registrada. As vendas aparecerão aqui conforme forem lançadas."
            hasRecords={data.recentSales.length > 0}
          >
            {data.recentSales.map((sale) => (
              <li
                key={sale.id}
                className="flex items-start justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold">
                    {sale.customerName || 'Cliente não informado'}
                  </p>
                  <p className="mt-1 text-xs text-[#896d5b]">
                    Venda #{sale.id} · {formatDateTime(sale.soldAt)}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-bold ${sale.status === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f8eee4] text-[#805038]'}`}
                  >
                    {saleLabels[sale.status]}
                  </span>
                </div>
                <strong className="shrink-0 text-sm">
                  {formatBrlMoney(sale.totalAmount)}
                </strong>
              </li>
            ))}
          </RecordList>
        </div>
      </section>
      <p className="text-sm leading-6 text-[#846859]">
        Para acompanhar receita por entrega, CMV, margens e caixa, use{' '}
        <Link to="/relatorios" className="font-bold text-[#75411f] underline">
          Relatórios
        </Link>{' '}
        e{' '}
        <Link to="/financeiro" className="font-bold text-[#75411f] underline">
          Financeiro
        </Link>
        . Metas permanecem separadas do resultado realizado.
      </p>
    </div>
  )
}

function Metric({
  title,
  value,
  detail,
  to,
  icon: Icon,
  warning = false,
}: {
  title: string
  value: string
  detail: string
  to: '/produtos' | '/estoque' | '/despesas'
  icon: typeof Package
  warning?: boolean
}) {
  return (
    <Link
      to={to}
      search={{ page: 1 }}
      className={`block rounded-2xl border p-4 sm:p-5 no-underline transition hover:shadow-sm ${warning ? 'border-[#e8bd9e] bg-[#fff8ef]' : 'border-[#ecdfd4] bg-white'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#846859]">{title}</h2>
        <Icon
          size={20}
          className={warning ? 'text-[#b65624]' : 'text-[#92522e]'}
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 break-words text-2xl font-bold sm:text-3xl text-[#321b13]">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#896d5b]">{detail}</p>
    </Link>
  )
}
function RecordList({
  title,
  to,
  hasRecords,
  empty,
  children,
}: {
  title: string
  to: '/compras' | '/vendas'
  hasRecords: boolean
  empty: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <Link
          to={to}
          search={{ page: 1 }}
          className="text-sm font-bold text-[#75411f]"
        >
          Ver todos
        </Link>
      </div>
      {hasRecords ? (
        <ul className="mt-2 divide-y divide-[#f0e5dc]">{children}</ul>
      ) : (
        <p className="py-6 text-sm leading-6 text-[#846859]">{empty}</p>
      )}
    </section>
  )
}
function formatQuantity(value: string, unit: string) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value))} ${unit === 'unit' ? 'un.' : unit}`
}
const saleLabels = {
  paid: 'Paga',
  confirmed: 'Confirmada',
  draft: 'Rascunho',
  cancelled: 'Cancelada',
}
