import { useState } from 'react'
import { EditorDialog } from '#/components/EditorDialog'

export type ScenarioAction = 'activate' | 'archive' | 'version'
const labels = {
  activate: { title: 'Ativar cenário', submit: 'Confirmar ativação' },
  archive: { title: 'Arquivar cenário', submit: 'Confirmar arquivamento' },
  version: {
    title: 'Criar nova versão',
    submit: 'Criar rascunho da nova versão',
  },
} as const

export function ScenarioActionDialog({
  action,
  name,
  version,
  activeName,
  onCancel,
  onConfirm,
}: {
  action: ScenarioAction
  name: string
  version: number
  activeName: string | null
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const label = labels[action]
  return (
    <EditorDialog
      title={label.title}
      description={`${name} · versão ${version}`}
      closeLabel="Fechar confirmação"
      submitLabel={label.submit}
      dirty={reason.trim().length > 0}
      onCancel={onCancel}
      onSave={async () => {
        if (reason.trim().length < 3)
          throw new Error('Informe um motivo com pelo menos três caracteres.')
        await onConfirm(reason.trim())
      }}
    >
      <p className="text-sm text-[#573524]">
        {action === 'activate'
          ? activeName
            ? `Este cenário passará a orientar as metas. O cenário ativo “${activeName}” será arquivado e seu histórico será preservado.`
            : 'Este cenário passará a orientar as metas. As vendas e os registros realizados permanecem separados da projeção.'
          : action === 'archive'
            ? 'O cenário ficará disponível no histórico. Se ele estiver ativo, deixará de orientar as metas até outra versão ser ativada.'
            : 'Será criado um rascunho com as mesmas premissas e produtos para você revisar. A versão anterior e seu histórico serão preservados.'}
      </p>
      <label className="block text-sm font-bold text-[#573524]">
        Motivo
        <textarea
          className="field mt-1.5 min-h-24"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </EditorDialog>
  )
}
