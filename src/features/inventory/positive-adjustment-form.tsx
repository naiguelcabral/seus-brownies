import { canSubmitPositiveAdjustment } from '#/features/inventory/lifecycle-ui'

export type PositiveAdjustmentValues = {
  productId: string
  quantity: string
  reason: string
  reference: string
  totalCost: string
  originReference: string
}

type ProductOption = { id: number; name: string; sku: string }

export function PositiveAdjustmentForm({
  products,
  values,
  setValues,
  pending,
  confirmed,
  setConfirmed,
  onSubmit,
}: {
  products: ProductOption[]
  values: PositiveAdjustmentValues
  setValues: (values: PositiveAdjustmentValues) => void
  pending: boolean
  confirmed: boolean
  setConfirmed: (confirmed: boolean) => void
  onSubmit: () => void
}) {
  const field = (label: string, value: string, key: keyof PositiveAdjustmentValues, placeholder = '') => (
    <label className="block text-xs font-bold">{label}
      <input className="field mt-1" value={value} placeholder={placeholder} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
    </label>
  )
  return <form className="rounded-xl border border-[#ead9ca] p-3 space-y-2" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
    <strong>Ajuste positivo</strong>
    <label className="block text-xs font-bold">Produto
      <select className="field mt-1" value={values.productId} onChange={(event) => setValues({ ...values, productId: event.target.value })}>
        <option value="">Selecione</option>
        {products.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.sku}</option>)}
      </select>
    </label>
    {field('Quantidade', values.quantity, 'quantity', '1,000')}
    {field('Custo total', values.totalCost, 'totalCost', '0,00')}
    {field('Origem do custo', values.originReference, 'originReference')}
    {field('Motivo', values.reason, 'reason')}
    {field('Referência', values.reference, 'reference')}
    <label className="flex gap-2 text-xs">
      <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
      Confirmo que este ajuste aumenta o estoque e cria uma camada FIFO com o custo total e a origem informados.
    </label>
    <button disabled={!canSubmitPositiveAdjustment(pending, values, confirmed)} className="action-button">Registrar ajuste positivo</button>
  </form>
}
