import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import {
  inspectTemporaryHmlFifoBridge,
  runTemporaryHmlFifoBridge,
} from '#/features/inventory/hml-fifo-bridge'

export const Route = createFileRoute('/hml-fifo-bridge')({
  loader: () => inspectTemporaryHmlFifoBridge(),
  component: HmlFifoBridgePage,
})

function HmlFifoBridgePage() {
  const initial = Route.useLoaderData()
  const run = useServerFn(runTemporaryHmlFifoBridge)
  const [summary, setSummary] = useState(initial)
  const [message, setMessage] = useState(
    'Pré-checagem concluída; nenhuma escrita foi realizada.',
  )
  async function apply() {
    setMessage('Executando transação HML...')
    try {
      setSummary(await run())
      setMessage('Backfill HML concluído.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha na ponte HML.')
    }
  }
  return (
    <main>
      <h1>Ponte temporária FIFO HML</h1>
      <p data-testid="hml-message">{message}</p>
      <pre data-testid="hml-summary">{JSON.stringify(summary)}</pre>
      <button data-testid="hml-run" onClick={apply}>
        Aplicar backfill HML
      </button>
    </main>
  )
}
