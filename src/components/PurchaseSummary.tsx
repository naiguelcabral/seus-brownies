import { centsToMoney, moneyToCents } from '#/features/production/calculations'
import { formatBrlMoney } from '#/lib/format-money'

/** Item amounts are already totals; quantity must never multiply them again. */
export function PurchaseSummary({ amounts }: { amounts: string[] }) {
  const parsed = amounts.map(moneyToCents)
  const complete = parsed.every((value) => value !== null && value >= 0n)
  const total = parsed.reduce<bigint>((sum, value) => sum + (value ?? 0n), 0n)
  return (
    <section
      aria-label="Resumo da compra"
      className="rounded-xl bg-[#f8f4ee] p-3"
      aria-live="polite"
    >
      <p className="text-sm font-bold">
        {amounts.length} {amounts.length === 1 ? 'item' : 'itens'} · Total da
        compra
      </p>
      <p className="mt-1 text-xl font-black">
        {complete
          ? formatBrlMoney(centsToMoney(total))
          : 'Preencha os valores dos itens'}
      </p>
      <p className="mt-2 text-xs text-[#846859]">
        O valor de cada item é o total pago, sem multiplicar pela quantidade.
        Registrar a compra dá entrada no estoque imediatamente.
      </p>
    </section>
  )
}
