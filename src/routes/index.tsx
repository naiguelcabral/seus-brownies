import { Boxes, Package, ReceiptText, ShoppingBag, Wallet } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { ManagementLayout } from '#/components/ManagementLayout'
import { getDashboard } from '#/features/operations/functions'

export const Route = createFileRoute('/')({
  loader: () => getDashboard(),
  component: DashboardPage,
})

function DashboardPage() {
  const dashboard = Route.useLoaderData()
  return (
    <ManagementLayout
      title="Visão geral"
      description="Acompanhe o que já foi registrado no Cacau. Os indicadores abaixo são calculados a partir do banco de dados."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Produtos ativos"
          value={String(dashboard.activeProducts)}
          icon={Package}
        />
        <Metric
          title="Estoque baixo"
          value={String(dashboard.lowStock.length)}
          icon={Boxes}
          warning
        />
        <Metric
          title="Itens com saldo"
          value={String(dashboard.productsWithStock)}
          icon={ShoppingBag}
        />
        <Metric
          title="Despesas do mês"
          value={currency.format(Number(dashboard.monthExpenses))}
          icon={Wallet}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecordList
          title="Compras recentes"
          icon={ReceiptText}
          empty="Registre uma compra para vê-la aqui."
        >
          {dashboard.recentPurchases.map((purchase) => (
            <li
              key={purchase.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-bold">{purchase.supplierName}</p>
                <p className="text-xs text-[#896d5b]">
                  {formatDate(purchase.purchasedAt)}
                </p>
              </div>
              <strong>{currency.format(Number(purchase.totalAmount))}</strong>
            </li>
          ))}
        </RecordList>
        <RecordList
          title="Vendas recentes"
          icon={ShoppingBag}
          empty="Registre uma venda para vê-la aqui."
        >
          {dashboard.recentSales.map((sale) => (
            <li
              key={sale.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-bold">
                  {sale.customerName || 'Cliente não informado'}
                </p>
                <p className="text-xs text-[#896d5b]">
                  {sale.status === 'paid'
                    ? 'Paga'
                    : sale.status === 'confirmed'
                      ? 'Confirmada'
                      : sale.status === 'draft'
                        ? 'Rascunho'
                        : 'Cancelada'}
                </p>
              </div>
              <strong>{currency.format(Number(sale.totalAmount))}</strong>
            </li>
          ))}
        </RecordList>
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
        <div className="border-b border-[#f0e5dc] px-5 py-4">
          <h2 className="font-bold">Itens com estoque baixo</h2>
        </div>
        {dashboard.lowStock.length ? (
          <ul className="divide-y divide-[#f0e5dc]">
            {dashboard.lowStock.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <span className="font-bold">{item.name}</span>
                <strong className="text-[#b65624]">
                  {formatQuantity(item.balance, item.unit)}
                  {item.reorderPoint
                    ? ` · limite ${formatQuantity(item.reorderPoint, item.unit)}`
                    : ' · limite padrão zero'}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Nenhum item atingiu o ponto de reposição no momento." />
        )}
      </section>
    </ManagementLayout>
  )
}

function Metric({
  title,
  value,
  icon: Icon,
  warning = false,
}: {
  title: string
  value: string
  icon: typeof Package
  warning?: boolean
}) {
  return (
    <article className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#846859]">{title}</p>
        <span
          className={`rounded-xl p-2 ${warning ? 'bg-[#fff0e3] text-[#b65624]' : 'bg-[#f8eee4] text-[#72462f]'}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-bold">{value}</p>
    </article>
  )
}
function RecordList({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string
  icon: typeof Package
  empty: string
  children: React.ReactNode
}) {
  const hasRecords = Array.isArray(children) && children.length > 0
  return (
    <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-[#a64f23]" />
        <h2 className="font-bold">{title}</h2>
      </div>
      {hasRecords ? (
        <ul className="mt-3 divide-y divide-[#f0e5dc]">{children}</ul>
      ) : (
        <Empty text={empty} />
      )}
    </section>
  )
}
function Empty({ text }: { text: string }) {
  return <p className="py-6 text-sm text-[#846859]">{text}</p>
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`))
}
function formatQuantity(value: string, unit: string) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value))} ${unit === 'unit' ? 'un.' : unit}`
}
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
