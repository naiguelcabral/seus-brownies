import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { resetPasswordWithTokenFn } from '#/features/auth/functions'
import { TurnstileChallenge } from '#/features/auth/turnstile-challenge'

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

export const Route = createFileRoute('/login/redefinir-senha')({
  validateSearch: (search) => ({
    // Keep an absent token absent. Serializing it as an empty string causes
    // the router to canonicalize the public route to `?token=` repeatedly.
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ name: 'referrer', content: 'no-referrer' }],
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const router = useRouter()
  const { token: tokenFromUrl } = Route.useSearch()
  const [token] = useState(tokenFromUrl)
  const resetPassword = useServerFn(resetPasswordWithTokenFn)
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [pending, setPending] = useState(false)
  const [requiresChallenge, setRequiresChallenge] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [challengeAttempt, setChallengeAttempt] = useState(0)
  const challengePending = requiresChallenge && !turnstileToken

  useEffect(() => {
    if (!tokenFromUrl) return
    void router.navigate({
      to: '/login/redefinir-senha',
      search: { token: undefined },
      replace: true,
    })
  }, [router, tokenFromUrl])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!token) {
      setMessage('Este link de recuperação é inválido ou expirou.')
      return
    }
    if (newPassword !== confirmation) {
      setMessage('As senhas não coincidem.')
      return
    }

    setPending(true)
    try {
      const result = await resetPassword({
        data: {
          token,
          newPassword,
          turnstileToken: turnstileToken ?? undefined,
        },
      })
      if (!result.ok) {
        const challengeRequired =
          'requiresChallenge' in result && result.requiresChallenge === true
        setRequiresChallenge(challengeRequired)
        if (!challengeRequired) setTurnstileToken(null)
        setMessage(
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Não foi possível redefinir a senha. Solicite um novo link.',
        )
        return
      }
      setCompleted(true)
    } catch {
      setMessage(
        'Não foi possível redefinir a senha. Solicite um novo link e tente novamente.',
      )
    } finally {
      if (turnstileToken) setChallengeAttempt((attempt) => attempt + 1)
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-[#ecdfd4] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#4a2114]">Redefinir senha</h1>
        {completed ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]">
              Senha alterada. Entre novamente para continuar.
            </p>
            <Link
              className="block w-full rounded-lg bg-[#4a2114] px-4 py-2.5 text-center text-sm font-bold text-white"
              to="/login"
              search={{ token: undefined }}
            >
              Ir para entrar
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <p className="text-sm text-[#75411f]">
              Crie uma senha entre 8 e 128 caracteres.
            </p>
            <label className="block text-sm font-bold text-[#4a2114]">
              Nova senha
              <input
                className="field mt-1.5 block w-full"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <label className="block text-sm font-bold text-[#4a2114]">
              Confirmar nova senha
              <input
                className="field mt-1.5 block w-full"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            {message ? (
              <p className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]">
                {message}
              </p>
            ) : null}
            <TurnstileChallenge
              onToken={setTurnstileToken}
              resetKey={challengeAttempt}
              requiresChallenge={requiresChallenge}
              siteKey={turnstileSiteKey}
            />
            <button
              className="w-full rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              type="submit"
              disabled={pending || challengePending}
            >
              {pending ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
