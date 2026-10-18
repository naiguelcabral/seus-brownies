import { useState } from 'react'
import { EditorDialog } from '../../components/EditorDialog'

// Canonical classifications are shared with the server validator.
import { salesLocationClassifications } from './classifications'

export type LocationFormValues = {
  name: string
  classification: (typeof salesLocationClassifications)[number]
  frequency: string
  notes: string
}
export const locationLabels: Record<
  LocationFormValues['classification'],
  string
> = {
  unclassified: 'Não classificado',
  physical: 'Físico',
  online: 'Online',
  event: 'Evento',
  partner: 'Parceiro',
}
export function LocationEditor({
  location,
  onCancel,
  onSave,
}: {
  location: {
    name: string
    classification: LocationFormValues['classification']
    frequency: string | null
    notes: string | null
  } | null
  onCancel: () => void
  onSave: (values: LocationFormValues) => Promise<void>
}) {
  const initialValues: LocationFormValues = {
    name: location?.name ?? '',
    classification: location?.classification ?? 'unclassified',
    frequency: location?.frequency ?? '',
    notes: location?.notes ?? '',
  }
  const [values, setValues] = useState(initialValues)
  async function save() {
    if (values.name.trim().length < 2)
      throw new Error('O nome do local deve ter pelo menos 2 caracteres.')
    await onSave(values)
  }
  return (
    <EditorDialog
      title={location ? 'Editar local' : 'Adicionar local'}
      description="Cadastre um ponto de venda ou canal. Campos com * são obrigatórios."
      closeLabel="Fechar cadastro de local"
      submitLabel={location ? 'Salvar alterações' : 'Adicionar local'}
      dirty={JSON.stringify(values) !== JSON.stringify(initialValues)}
      onCancel={onCancel}
      onSave={save}
    >
      <label className="block text-sm font-bold text-[#573524]">
        Nome *
        <input
          required
          minLength={2}
          maxLength={120}
          className="field mt-1.5"
          value={values.name}
          onChange={(event) =>
            setValues({ ...values, name: event.target.value })
          }
          placeholder="Ex.: Feira de sábado"
        />
      </label>
      <label className="block text-sm font-bold text-[#573524]">
        Tipo
        <select
          className="field mt-1.5"
          value={values.classification}
          onChange={(event) => {
            const classification = salesLocationClassifications.find(
              (value) => value === event.target.value,
            )
            if (classification) setValues({ ...values, classification })
          }}
        >
          {salesLocationClassifications.map((value) => (
            <option key={value} value={value}>
              {locationLabels[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-[#573524]">
        Frequência (opcional)
        <input
          maxLength={80}
          className="field mt-1.5"
          value={values.frequency}
          onChange={(event) =>
            setValues({ ...values, frequency: event.target.value })
          }
          placeholder="Ex.: Aos sábados, das 9h às 13h"
        />
      </label>
      <label className="block text-sm font-bold text-[#573524]">
        Observação (opcional)
        <textarea
          maxLength={1000}
          className="field mt-1.5 min-h-20 resize-y"
          value={values.notes}
          onChange={(event) =>
            setValues({ ...values, notes: event.target.value })
          }
        />
      </label>
    </EditorDialog>
  )
}
