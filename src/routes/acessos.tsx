import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { ManagementLayout } from '#/components/ManagementLayout'
import {
  approveRegistration,
  findRegistrationCandidate,
} from '#/features/auth/registration-approval.functions'

export const Route = createFileRoute('/acessos')({
  component: AccessApprovalPage,
})

type Lookup = Awaited<ReturnType<typeof findRegistrationCandidate>>
type Candidate = Extract<Lookup, { ok: true }>['candidate'] & {
  operationReference: string
}

function AccessApprovalPage() {
  const router = useRouter()
  const lookup = useServerFn(findRegistrationCandidate)
  const approve = useServerFn(approveRegistration)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <ManagementLayout
      title="Aprovar cadastros"
      description="Libere o primeiro acesso de um Funcionário após conferir o cadastro."
    >
      <section className="max-w-2xl rounded-2xl border border-[#ecdfd4] bg-white p-5">
        <p className="mb-5 text-sm text-[#846859]">
          O cadastro precisa estar completo e com e-mail confirmado. Promoções e
          reativações devem ser tratadas pelo Dono.
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            setBusy(true)
            setCandidate(null)
            setMessage(null)
            setReason('')
            try {
              const result = await lookup({
                data: { email: String(data.get('email') ?? '') },
              })
              if (result.ok)
                setCandidate({
                  ...result.candidate,
                  operationReference: crypto.randomUUID(),
                })
              else setMessage(result.message)
            } catch {
              setMessage(
                'Não foi possível verificar o cadastro. Tente novamente.',
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          <label className="min-w-0 flex-1 text-sm font-bold">
            E-mail do cadastro
            <input
              className="field mt-1 block w-full"
              name="email"
              type="email"
              autoComplete="off"
              maxLength={320}
              required
              disabled={busy}
            />
          </label>
          <button
            className="rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy}
          >
            Verificar cadastro
          </button>
        </form>
        {message ? (
          <p role="status" className="mt-4 text-sm text-[#75411f]">
            {message}
          </p>
        ) : null}
        {candidate ? (
          <form
            className="mt-6 grid gap-4 border-t border-[#ecdfd4] pt-5"
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy(true)
              setMessage(null)
              try {
                const result = await approve({
                  data: {
                    authUserId: candidate.id,
                    revision: candidate.revision,
                    operationReference: candidate.operationReference,
                    reason,
                  },
                })
                if (!result.ok) {
                  setMessage(result.message)
                  return
                }
                setCandidate(null)
                setReason('')
                setMessage(
                  'Acesso de Funcionário aprovado. A pessoa deve sair da conta e entrar novamente para usar o sistema.',
                )
                await router.invalidate()
              } catch {
                setMessage(
                  'Não foi possível confirmar a aprovação. Tente novamente com os mesmos dados.',
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            <div className="min-w-0">
              <h2 className="font-bold">{candidate.name}</h2>
              <p className="break-words text-sm text-[#846859]">
                {candidate.email}
              </p>
              <p className="mt-1 text-sm">
                E-mail confirmado · primeiro acesso como Funcionário
              </p>
            </div>
            <label className="text-sm font-bold">
              Motivo da liberação
              <textarea
                className="field mt-1 block w-full"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                maxLength={500}
                required
                disabled={busy}
              />
            </label>
            <button
              className="justify-self-start rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              disabled={busy}
            >
              Aprovar como Funcionário
            </button>
          </form>
        ) : null}
      </section>
    </ManagementLayout>
  )
}
