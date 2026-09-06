import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import {
  loginWithEmailPassword,
  requestPasswordResetFn,
  resendEmailVerificationOtpFn,
  signUpWithEmailPasswordFn,
  verifyEmailVerificationOtpFn,
} from '#/features/auth/functions'
import { getSessionStatus } from '#/features/auth/session-status.functions'
import { TurnstileChallenge } from '#/features/auth/turnstile-challenge'

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

export const Route = createFileRoute('/login')({
  validateSearch: (search) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Better Auth appends the reset token to the configured redirect URL. Keep
    // this compatibility path for links generated with /login before the
    // dedicated reset route was configured.
    if (search.token) {
      throw redirect({
        to: '/login/redefinir-senha',
        search: { token: search.token },
        throw: true,
      })
    }
    const { authenticated } = await getSessionStatus()
    if (authenticated) throw redirect({ to: '/', throw: true })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const login = useServerFn(loginWithEmailPassword)
  const signUp = useServerFn(signUpWithEmailPasswordFn)
  const resendOtp = useServerFn(resendEmailVerificationOtpFn)
  const verifyOtp = useServerFn(verifyEmailVerificationOtpFn)
  const requestPasswordReset = useServerFn(requestPasswordResetFn)
  const [mode, setMode] = useState<
    'sign-in' | 'sign-up' | 'verify-email' | 'request-password-reset'
  >('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [requiresChallenge, setRequiresChallenge] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const challengePending = requiresChallenge && !turnstileToken

  function captureChallenge(result: { requiresChallenge?: boolean }) {
    const required = result.requiresChallenge === true
    setRequiresChallenge(required)
    if (!required) setTurnstileToken(null)
  }

  function changeMode(
    nextMode: 'sign-in' | 'sign-up' | 'request-password-reset',
  ) {
    setMode(nextMode)
    setMessage(null)
    setRequiresChallenge(false)
    setTurnstileToken(null)
  }

  function renderTurnstileChallenge() {
    return (
      <TurnstileChallenge
        onToken={setTurnstileToken}
        requiresChallenge={requiresChallenge}
        siteKey={turnstileSiteKey}
      />
    )
  }

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      const result =
        mode === 'sign-up'
          ? await signUp({
              data: {
                name,
                email,
                password,
                turnstileToken: turnstileToken ?? undefined,
              },
            })
          : await login({
              data: {
                email,
                password,
                turnstileToken: turnstileToken ?? undefined,
              },
            })
      if (!result.ok) {
        captureChallenge(result)
        setMessage(result.message)
        return
      }
      captureChallenge(result)
      if (mode === 'sign-up') {
        setMode('verify-email')
        setMessage(result.message)
        return
      }
      await router.navigate({ to: '/' })
    } catch {
      setMessage('Não foi possível iniciar a sessão. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  async function submitOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      const result = await verifyOtp({
        data: { email, otp, turnstileToken: turnstileToken ?? undefined },
      })
      captureChallenge(result)
      setMessage(
        result.ok
          ? 'E-mail verificado. Sua conta não terá acesso operacional até receber uma permissão do Cacau.'
          : result.message,
      )
    } catch {
      setMessage('Não foi possível verificar o código. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  async function resend() {
    setPending(true)
    setMessage(null)

    try {
      const result = await resendOtp({
        data: { email, turnstileToken: turnstileToken ?? undefined },
      })
      captureChallenge(result)
      setMessage(result.message)
    } catch {
      setMessage('Não foi possível solicitar um novo código. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  async function submitPasswordResetRequest(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      const result = await requestPasswordReset({
        data: { email, turnstileToken: turnstileToken ?? undefined },
      })
      captureChallenge(result)
      setMessage(result.message)
    } catch {
      setMessage(
        'Se houver uma conta compatível, enviaremos instruções para o e-mail informado.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-[#ecdfd4] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#4a2114]">
          {mode === 'verify-email'
            ? 'Verifique seu e-mail'
            : mode === 'request-password-reset'
              ? 'Recuperar senha'
              : mode === 'sign-up'
                ? 'Criar conta no Cacau'
                : 'Entrar no Cacau'}
        </h1>
        {mode === 'verify-email' ? (
          <form className="mt-6 space-y-4" onSubmit={submitOtp}>
            <p className="text-sm text-[#75411f]">
              Informe o código enviado para {email}.
            </p>
            <label className="block text-sm font-bold text-[#4a2114]">
              Código de verificação
              <input
                className="field mt-1.5 block w-full"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
            </label>
            {message ? (
              <p className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]">
                {message}
              </p>
            ) : null}
            {renderTurnstileChallenge()}
            <button
              className="w-full rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              type="submit"
              disabled={pending || challengePending}
            >
              {pending ? 'Verificando...' : 'Verificar e-mail'}
            </button>
            <button
              className="w-full rounded-lg border border-[#4a2114] px-4 py-2.5 text-sm font-bold text-[#4a2114] disabled:opacity-60"
              type="button"
              onClick={resend}
              disabled={pending || challengePending}
            >
              Reenviar código
            </button>
          </form>
        ) : mode === 'request-password-reset' ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={submitPasswordResetRequest}
          >
            <p className="text-sm text-[#75411f]">
              Informe seu e-mail para receber as instruções de recuperação.
            </p>
            <label className="block text-sm font-bold text-[#4a2114]">
              E-mail
              <input
                className="field mt-1.5 block w-full"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {message ? (
              <p className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]">
                {message}
              </p>
            ) : null}
            {renderTurnstileChallenge()}
            <button
              className="w-full rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              type="submit"
              disabled={pending || challengePending}
            >
              {pending ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <button
              className="w-full text-sm font-bold text-[#4a2114] underline"
              type="button"
              onClick={() => {
                changeMode('sign-in')
              }}
              disabled={pending}
            >
              Voltar para entrar
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submitCredentials}>
            {mode === 'sign-up' ? (
              <label className="block text-sm font-bold text-[#4a2114]">
                Nome
                <input
                  className="field mt-1.5 block w-full"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}
            <label className="block text-sm font-bold text-[#4a2114]">
              E-mail
              <input
                className="field mt-1.5 block w-full"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block text-sm font-bold text-[#4a2114]">
              Senha
              <input
                className="field mt-1.5 block w-full"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === 'sign-up' ? 'new-password' : 'current-password'
                }
                required
              />
            </label>
            {message ? (
              <p className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]">
                {message}
              </p>
            ) : null}
            {renderTurnstileChallenge()}
            <button
              className="w-full rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              type="submit"
              disabled={pending || challengePending}
            >
              {pending
                ? mode === 'sign-up'
                  ? 'Cadastrando...'
                  : 'Entrando...'
                : mode === 'sign-up'
                  ? 'Cadastrar'
                  : 'Entrar'}
            </button>
            <button
              className="w-full text-sm font-bold text-[#4a2114] underline"
              type="button"
              onClick={() => {
                changeMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')
              }}
              disabled={pending}
            >
              {mode === 'sign-up' ? 'Já tenho uma conta' : 'Criar uma conta'}
            </button>
            {mode === 'sign-in' ? (
              <button
                className="w-full text-sm font-bold text-[#4a2114] underline"
                type="button"
                onClick={() => {
                  changeMode('request-password-reset')
                }}
                disabled={pending}
              >
                Esqueci minha senha
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  )
}
