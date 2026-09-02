import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { getFifoMigrationAudit } from '#/features/inventory/fifo-migration-audit'

export const Route = createFileRoute('/fifo-migration-audit')({ component: FifoMigrationAuditPage })

function FifoMigrationAuditPage() {
  const auditMigration = useServerFn(getFifoMigrationAudit)
  const [payload, setPayload] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    void auditMigration().then((result) => setPayload(JSON.stringify(result))).catch(() => setFailed(true))
  }, [auditMigration])
  return <main><span data-testid="fifo-migration-audit-client-ready">Cliente pronto</span>{payload ? <pre data-testid="fifo-migration-audit-result">{payload}</pre> : null}{failed ? <p data-testid="fifo-migration-audit-error">Auditoria indisponível.</p> : null}</main>
}
