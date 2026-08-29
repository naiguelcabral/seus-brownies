import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ManagementLayout } from '#/components/ManagementLayout'
import { listInventory } from '#/features/operations/functions'
import { formatDateTime } from '#/lib/format'

export const Route = createFileRoute('/estoque')({
  loader: () => listInventory(),
  component: InventoryPage,
})

const movementLabels = {
  purchase: 'Compra',
  production: 'Produção',
  sale: 'Venda',
  adjustment: 'Ajuste',
  loss: 'Perda',
  return: 'Devolução',
}

function InventoryPage() {
  const { balances, movements } = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const filtered = useMemo(
    () =>
      balances.filter(
        (item) =>
          (type === 'all' || item.type === type) &&
          `${item.name} ${item.sku}`
            .toLocaleLowerCase('pt-BR')
            .includes(search.toLocaleLowerCase('pt-BR')),
      ),
    [balances, search, type],
  )
  return (
    <ManagementLayout
      title="Estoque"
      description="O saldo é calculado pela soma das movimentações. Compras entram; vendas confirmadas ou pagas saem."
    >
      <section className="rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field flex-1"
            placeholder="Filtrar por nome ou SKU"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="field sm:w-52"
          >
            <option value="all">Todos os tipos</option>
            <option value="ingredient">Ingredientes</option>
            <option value="packaging">Embalagens</option>
            <option value="finished_product">Produtos finais</option>
          </select>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-[#f0e5dc] bg-[#fffaf5] text-xs uppercase text-[#896d5b]">
              <tr>
                <th className="px-3 py-3">Produto</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Categoria</th>
                <th className="px-3 py-3 text-right">Saldo calculado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e5dc]">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <strong>{item.name}</strong>
                    <span className="ml-2 text-xs text-[#896d5b]">
                      {item.sku}
                    </span>
                  </td>
                  <td className="px-3 py-3">{typeLabel(item.type)}</td>
                  <td className="px-3 py-3">{item.categoryName ?? '—'}</td>
                  <td
                    className={`px-3 py-3 text-right font-bold ${Number(item.balance) <= 0 ? 'text-[#b65624]' : ''}`}
                  >
                    {formatQuantity(item.balance, item.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#846859]">
              Nenhum produto encontrado.
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ecdfd4] bg-white">
        <div className="border-b border-[#f0e5dc] px-5 py-4">
          <h2 className="font-bold">Histórico de movimentações</h2>
        </div>
        {movements.length ? (
          <ul className="divide-y divide-[#f0e5dc]">
            {movements.map((movement) => (
              <li
                key={movement.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="font-bold">{movement.productName}</p>
                  <p className="text-xs text-[#896d5b]">
                    {movementLabels[movement.type]} · {formatDateTime(movement.occurredAt)}
                  </p>
                </div>
                <strong
                  className={
                    movement.quantityDelta.startsWith('-')
                      ? 'text-[#b65624]'
                      : 'text-emerald-700'
                  }
                >
                  {movement.quantityDelta.startsWith('-') ? '' : '+'}
                  {formatQuantity(movement.quantityDelta, movement.productUnit)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-[#846859]">
            O histórico aparecerá após a primeira compra, venda ou ajuste.
          </p>
        )}
      </section>
    </ManagementLayout>
  )
}

function formatQuantity(value: string, unit: string) {
  return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Number(value))} ${unit === 'unit' ? 'un.' : unit}`
}
function typeLabel(type: string) {
  return type === 'ingredient'
    ? 'Ingrediente'
    : type === 'packaging'
      ? 'Embalagem'
      : 'Produto final'
}
