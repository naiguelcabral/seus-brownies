import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { ManagementLayout } from '#/components/ManagementLayout'
import { checkSqlConnection } from '#/features/diagnostics/functions'

export const Route = createFileRoute('/diagnostico-conexao')({
  component: ConnectionDiagnosticPage,
})

function ConnectionDiagnosticPage() {
  const check = useServerFn(checkSqlConnection)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function verify() {
    setBusy(true)
    setMessage('')
    try {
      const result = await check()
      setMessage(
        result.ok
          ? `Conexão SQL confirmada em ${result.checkedAt}.`
          : 'Não foi possível confirmar a conexão SQL.',
      )
    } catch {
      setMessage('Diagnóstico desativado, não autorizado ou indisponível.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ManagementLayout
      title="Diagnóstico de conexão"
      description="Verificação administrativa da conexão com o banco."
    >
      <p className="mb-4 text-sm">
        O teste confirma a conexão. A validação da estrutura e dos dados do
        banco exige uma auditoria separada.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void verify()}
        className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Verificando…' : 'Verificar conexão'}
      </button>
      <p role="status" className="mt-4 text-sm">
        {message}
      </p>
    </ManagementLayout>
  )
}
