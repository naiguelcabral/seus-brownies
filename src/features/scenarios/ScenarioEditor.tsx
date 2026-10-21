import { formatBrlMoney } from '#/lib/format-money'
import { formatBps } from './ScenarioSummary'
import { calculateScenarioProjection } from './calculations'
import { scenarioDraftValues } from './contracts'

export type MixFormRow = {
  productId: number
  originalWeight: string
  plannedUnitPrice: string
  plannedUnitCost: string
}

export type ActiveProductOption = {
  id: number
  name: string
  salePrice: string | null
}

export type ScenarioForm = {
  name: string
  description: string
  effectiveOn: string
  monthlyProfitGoal: string
  fixedMonthlyCosts: string
  salesDaysPerMonth: string
  weeksPerMonth: string
  minimumMarginRate: string
  feeTaxReserveRate: string
  mix: MixFormRow[]
}

export function ScenarioEditor({
  form,
  editing,
  products,
  selectedProduct,
  saving,
  onSubmit,
  onChange,
  onMixChange,
  onSelectedProduct,
  onAddProduct,
  onRemoveProduct,
  onCancel,
}: {
  form: ScenarioForm
  editing: boolean
  products: ActiveProductOption[]
  selectedProduct: string
  saving: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onChange: <TField extends keyof ScenarioForm>(
    field: TField,
    value: ScenarioForm[TField],
  ) => void
  onMixChange: (index: number, field: keyof MixFormRow, value: string) => void
  onSelectedProduct: (value: string) => void
  onAddProduct: () => void
  onRemoveProduct: (index: number) => void
  onCancel: () => void
}) {
  const names = new Map<number, string>(
    products.map((product: ActiveProductOption) => [product.id, product.name]),
  )
  const parsed = scenarioDraftValues.safeParse({
    ...form,
    salesDaysPerMonth: Number(form.salesDaysPerMonth),
  })
  let preview: ReturnType<typeof calculateScenarioProjection> | null = null
  let previewMessage =
    'Preencha as premissas e os produtos para conferir a projeção antes de salvar.'
  if (parsed.success && form.mix.length > 0) {
    try {
      preview = calculateScenarioProjection(
        parsed.data,
        products.map((product) => ({
          ...product,
          type: 'finished_product',
          isActive: true,
        })),
      )
    } catch (error) {
      previewMessage =
        error instanceof Error ? error.message : 'Confira as premissas do mix.'
    }
  }
  return (
    <form
      className="space-y-4 rounded-2xl border border-[#ecdfd4] bg-white p-5"
      onSubmit={onSubmit}
    >
      <div>
        <h2 className="font-bold">
          {editing ? 'Editar rascunho' : 'Novo cenário'}
        </h2>
        <p className="mt-1 text-xs text-[#846859]">
          Nenhum valor do workbook é criado automaticamente. Informe premissas
          verificadas pelo Dono.
        </p>
      </div>
      <Field
        label="Nome"
        value={form.name}
        onChange={(value) => onChange('name', value)}
      />
      <label className="block text-sm font-bold text-[#573524]">
        Descrição opcional
        <textarea
          className="field mt-1.5 min-h-20"
          value={form.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </label>
      <Field
        label="Data de vigência"
        type="date"
        value={form.effectiveOn}
        onChange={(value) => onChange('effectiveOn', value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Meta de lucro mensal (R$)"
          value={form.monthlyProfitGoal}
          onChange={(value) => onChange('monthlyProfitGoal', value)}
        />
        <Field
          label="Custos fixos mensais (R$)"
          value={form.fixedMonthlyCosts}
          onChange={(value) => onChange('fixedMonthlyCosts', value)}
        />
        <Field
          label="Dias de venda no mês"
          inputMode="numeric"
          value={form.salesDaysPerMonth}
          onChange={(value) => onChange('salesDaysPerMonth', value)}
        />
        <Field
          label="Semanas no mês"
          value={form.weeksPerMonth}
          onChange={(value) => onChange('weeksPerMonth', value)}
        />
        <Field
          label="Margem mínima (0,70 = 70%)"
          value={form.minimumMarginRate}
          onChange={(value) => onChange('minimumMarginRate', value)}
        />
        <Field
          label="Reserva de taxas e impostos (0,03 = 3%)"
          value={form.feeTaxReserveRate}
          onChange={(value) => onChange('feeTaxReserveRate', value)}
        />
      </div>

      <fieldset className="space-y-3 border-t border-[#eadbd0] pt-4">
        <legend className="font-bold">Mix planejado por produto</legend>
        <p className="text-xs text-[#846859]">
          Informe a participação relativa de cada produto. O sistema ajusta o
          mix proporcionalmente para 100%, preservando os pesos informados.
        </p>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs font-bold text-[#573524]">
            Produto ativo
            <select
              className="field mt-1"
              value={selectedProduct}
              onChange={(event) => onSelectedProduct(event.target.value)}
            >
              <option value="">Selecione</option>
              {products
                .filter(
                  (product) =>
                    !form.mix.some((row) => row.productId === product.id),
                )
                .map((product: ActiveProductOption) => (
                  <option value={product.id} key={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-[#4a2114] px-3 py-2 text-xs font-bold"
            onClick={onAddProduct}
            disabled={!selectedProduct || saving}
          >
            Adicionar
          </button>
        </div>
        {form.mix.length ? (
          <div className="space-y-3">
            {form.mix.map((row, index) => (
              <div
                className="rounded-xl border border-[#eadbd0] p-3"
                key={row.productId}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {names.get(row.productId) ?? `Produto ${row.productId}`}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-bold text-[#a63c23]"
                    onClick={() => onRemoveProduct(index)}
                  >
                    Remover
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Participação informada (0,33 = 33%)"
                    value={row.originalWeight}
                    onChange={(value) =>
                      onMixChange(index, 'originalWeight', value)
                    }
                  />
                  <Field
                    label="Preço planejado (R$)"
                    value={row.plannedUnitPrice}
                    onChange={(value) =>
                      onMixChange(index, 'plannedUnitPrice', value)
                    }
                  />
                  <Field
                    label="Custo unitário planejado (R$)"
                    value={row.plannedUnitCost}
                    onChange={(value) =>
                      onMixChange(index, 'plannedUnitCost', value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[#c7b8aa] p-3 text-xs text-[#735d50]">
            Mix vazio. O rascunho pode ser salvo, mas não pode ser ativado.
          </p>
        )}
      </fieldset>
      <section
        aria-label="Prévia do rascunho"
        className="rounded-xl bg-[#f8f4ee] p-4"
        aria-live="polite"
      >
        <h3 className="font-bold">Prévia do rascunho</h3>
        {preview ? (
          <>
            <p className="mt-2 text-sm">
              Mix ajustado: 100,00% · {preview.unitsPerMonth} unidades estimadas
              no mês.
            </p>
            <p className="mt-1 text-sm">
              Faturamento-alvo: {formatBrlMoney(preview.targetRevenue)} · lucro
              projetado: {formatBrlMoney(preview.projectedManagerialProfit)}.
            </p>
            <p className="mt-2 text-xs text-[#846859]">
              {Number(form.feeTaxReserveRate.replace(',', '.')) === 0
                ? 'Antes das taxas de pagamento.'
                : 'Considera a reserva informada.'}{' '}
              Estimativa conjunta, sem registrar vendas.
            </p>
            <ul className="mt-2 text-xs">
              {preview.productLines.map((line) => (
                <li key={line.productId}>
                  {line.productName}: {formatBps(line.normalizedWeightBps)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm">{previewMessage}</p>
        )}
      </section>
      <div className="sticky bottom-0 flex gap-3 border-t border-[#eadbd0] bg-white py-3">
        <button
          disabled={saving}
          className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar rascunho'}
        </button>
        <button type="button" className="text-sm font-bold" onClick={onCancel}>
          Fechar sem salvar
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode = 'decimal',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="block text-xs font-bold text-[#573524]">
      {label}
      <input
        className="field mt-1"
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}
