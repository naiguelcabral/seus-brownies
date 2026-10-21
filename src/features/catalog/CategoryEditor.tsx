import { useState } from 'react'
import { EditorDialog } from '../../components/EditorDialog'

export type CategoryFormValues = { name: string; description: string }
export function CategoryEditor({
  category,
  onCancel,
  onSave,
}: {
  category: { name: string; description: string | null } | null
  onCancel: () => void
  onSave: (values: CategoryFormValues) => Promise<void>
}) {
  const initialValues = {
    name: category?.name ?? '',
    description: category?.description ?? '',
  }
  const [values, setValues] = useState(initialValues)
  async function save() {
    if (values.name.trim().length < 2)
      throw new Error('O nome da categoria deve ter pelo menos 2 caracteres.')
    await onSave(values)
  }
  return (
    <EditorDialog
      title={category ? 'Editar categoria' : 'Adicionar categoria'}
      description="Organize seus produtos por categoria. Campos com * são obrigatórios."
      closeLabel="Fechar cadastro de categoria"
      submitLabel={category ? 'Salvar alterações' : 'Adicionar categoria'}
      dirty={JSON.stringify(values) !== JSON.stringify(initialValues)}
      onCancel={onCancel}
      onSave={save}
    >
      <label className="block text-sm font-bold text-[#573524]">
        Nome *
        <input
          required
          minLength={2}
          maxLength={80}
          className="field mt-1.5"
          value={values.name}
          onChange={(event) =>
            setValues({ ...values, name: event.target.value })
          }
          placeholder="Ex.: Brownies recheados"
        />
      </label>
      <label className="block text-sm font-bold text-[#573524]">
        Descrição (opcional)
        <textarea
          maxLength={500}
          className="field mt-1.5 min-h-24 resize-y"
          value={values.description}
          onChange={(event) =>
            setValues({ ...values, description: event.target.value })
          }
          placeholder="Como essa categoria será usada"
        />
      </label>
    </EditorDialog>
  )
}
