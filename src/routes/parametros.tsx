import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { parseFeePercent, parseFixedFee } from '#/features/finance/payment-fees'
import { PaymentFeeCalculator } from '#/components/PaymentFeeCalculator'
import { ManagementLayout } from '#/components/ManagementLayout'
import {
  getManagementSettings,
  updateManagementSettings,
} from '#/features/management/functions'

export const Route = createFileRoute('/parametros')({
  loader: () => getManagementSettings(),
  component: ManagementSettingsPage,
  pendingComponent: SettingsPending,
  pendingMs: 300,
  errorComponent: SettingsError,
})

function ManagementSettingsPage() {
  const settings = Route.useLoaderData()
  const router = useRouter()
  const save = useServerFn(updateManagementSettings)
  const [values, setValues] = useState(() => ({
    monthlyProfitGoal: settings.monthlyProfitGoal,
    fixedMonthlyCosts: settings.fixedMonthlyCosts,
    salesDaysPerMonth: String(settings.salesDaysPerMonth),
    weeksPerMonth: settings.weeksPerMonth,
    normalRevenueTolerance: settings.normalRevenueTolerance,
    criticalRevenueTolerance: settings.criticalRevenueTolerance,
    minimumProductMargin: settings.minimumProductMargin,
    feeTaxReserveRate: settings.feeTaxReserveRate,
  }))
  const [fees, setFees] = useState(() => ({
    debit: settings.paymentFees
      ? String(settings.paymentFees.debitBps / 100)
      : '',
    credit: settings.paymentFees
      ? String(settings.paymentFees.creditBps / 100)
      : '',
    pix: settings.paymentFees
      ? String(settings.paymentFees.pixFixedCents / 100)
      : '',
    effectiveOn:
      settings.paymentFees?.effectiveOn ??
      new Date().toISOString().slice(0, 10),
  }))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await save({
        data: {
          ...values,
          salesDaysPerMonth: Number(values.salesDaysPerMonth),
          expectedVersion: settings.version,
          paymentFees:
            fees.debit || fees.credit || fees.pix
              ? {
                  debitBps: parseFeePercent(fees.debit),
                  creditBps: parseFeePercent(fees.credit),
                  pixFixedCents: parseFixedFee(fees.pix),
                  effectiveOn: fees.effectiveOn,
                }
              : null,
        },
      })
      setMessage('Parâmetros salvos e auditados.')
      await router.invalidate()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar os parâmetros.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ManagementLayout
      title="Parâmetros gerenciais"
      description="Premissas centralizadas, validadas no servidor e disponíveis apenas ao papel autorizado."
    >
      <form
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5"
        onSubmit={submit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Meta de lucro líquido mensal"
            value={values.monthlyProfitGoal}
            onChange={(value) => update('monthlyProfitGoal', value)}
            hint="R$; objetivo gerencial, não faturamento."
          />
          <Field
            label="Custos fixos mensais"
            value={values.fixedMonthlyCosts}
            onChange={(value) => update('fixedMonthlyCosts', value)}
            hint="R$; inclui mão de obra, energia e MEI. Não lança despesa paga."
          />
          <Field
            label="Dias de venda por mês"
            value={values.salesDaysPerMonth}
            onChange={(value) => update('salesDaysPerMonth', value)}
            inputMode="numeric"
          />
          <Field
            label="Semanas por mês"
            value={values.weeksPerMonth}
            onChange={(value) => update('weeksPerMonth', value)}
          />
          <Field
            label="Tolerância normal de receita"
            value={values.normalRevenueTolerance}
            onChange={(value) => update('normalRevenueTolerance', value)}
            hint="Use 0,03 para 3%."
          />
          <Field
            label="Tolerância crítica de receita"
            value={values.criticalRevenueTolerance}
            onChange={(value) => update('criticalRevenueTolerance', value)}
            hint="Deve ser maior que a tolerância normal."
          />
          <Field
            label="Margem mínima de produto"
            value={values.minimumProductMargin}
            onChange={(value) => update('minimumProductMargin', value)}
            hint="Use 0,70 para 70%. Alerta gerencial de margem."
          />
          <Field
            label="Reserva para taxas e impostos"
            value={values.feeTaxReserveRate}
            onChange={(value) => update('feeTaxReserveRate', value)}
            hint="Reserva percentual de planejamento. Não substitui as tarifas por pagamento."
          />
        </div>
        <fieldset className="mt-5 rounded-xl border border-[#ecdfd4] p-4">
          <legend className="font-bold">Taxas por meio de pagamento</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Débito (%)"
              value={fees.debit}
              onChange={(value) =>
                setFees((current) => ({ ...current, debit: value }))
              }
            />
            <Field
              label="Crédito (%)"
              value={fees.credit}
              onChange={(value) =>
                setFees((current) => ({ ...current, credit: value }))
              }
            />
            <Field
              label="Pix (R$ por transação)"
              value={fees.pix}
              onChange={(value) =>
                setFees((current) => ({ ...current, pix: value }))
              }
            />
            <label className="text-sm font-bold">
              Vigência
              <input
                type="date"
                className="field mt-1"
                value={fees.effectiveOn}
                onChange={(event) =>
                  setFees((current) => ({
                    ...current,
                    effectiveOn: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <p className="mt-2 text-xs">
            A combinação de pagamentos varia por local. As taxas ficam
            separadas; o Pix não é percentual.
          </p>
        </fieldset>
        {message ? (
          <p
            className="mt-4 rounded-lg bg-[#fff5e7] p-3 text-sm text-[#75411f]"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <button
          disabled={saving}
          className="mt-5 rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar parâmetros'}
        </button>
      </form>
      <PaymentFeeCalculator schedule={settings.paymentFees} />
    </ManagementLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  hint,
  inputMode = 'decimal',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="text-sm font-bold text-[#573524]">
      {label}
      <input
        className="field mt-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        required
      />
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-[#846859]">
          {hint}
        </span>
      ) : null}
    </label>
  )
}

function SettingsPending() {
  return (
    <ManagementLayout
      title="Parâmetros gerenciais"
      description="Carregando premissas."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm"
      >
        Carregando parâmetros…
      </p>
    </ManagementLayout>
  )
}

function SettingsError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Parâmetros gerenciais"
      description="Não foi possível carregar as premissas."
    >
      <div className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5 text-sm text-[#75411f]">
        <p>
          {(error instanceof Error && error.message) ||
            'Tente novamente em alguns instantes.'}
        </p>
        <button
          className="mt-3 rounded-lg border border-[#75411f] px-3 py-2 text-xs font-bold"
          onClick={() => void router.invalidate()}
        >
          Tentar novamente
        </button>
      </div>
    </ManagementLayout>
  )
}
