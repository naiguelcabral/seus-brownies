import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { loginWithEmailPassword } from '#/features/auth/functions'
import { getSessionStatus } from '#/features/auth/session-status.functions'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { authenticated } = await getSessionStatus()
    if (authenticated) throw redirect({ to: '/', throw: true })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const login = useServerFn(loginWithEmailPassword)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)

    try {
      const result = await login({ data: { email, password } })
      if (!result.ok) {
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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-[#ecdfd4] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#4a2114]">Entrar no Cacau</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
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
              autoComplete="current-password"
              required
            />
          </label>
          {message ? (
            <p className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]">
              {message}
            </p>
          ) : null}
          <button
            className="w-full rounded-lg bg-[#4a2114] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}
