import {
  Boxes,
  BarChart3,
  CookingPot,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  MapPin,
  ReceiptText,
  Settings,
  ShoppingBag,
  Tags,
  Wallet,
} from 'lucide-react'
import { Link, getRouteApi, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { logout } from '#/features/auth/functions'
import { hasPermission } from '#/features/auth/authorization'
import type { Permission } from '#/features/auth/authorization'

const rootRoute = getRouteApi('__root__')

const navigation = [
  {
    to: '/',
    label: 'Visão geral',
    icon: LayoutDashboard,
    permission: 'dashboard:read',
  },
  {
    to: '/categorias',
    label: 'Categorias',
    icon: Tags,
    permission: 'catalog:read',
  },
  {
    to: '/produtos',
    label: 'Produtos',
    icon: Package,
    permission: 'catalog:read',
  },
  {
    to: '/locais',
    label: 'Locais',
    icon: MapPin,
    permission: 'catalog:write',
  },
  {
    to: '/compras',
    label: 'Compras',
    icon: ReceiptText,
    permission: 'purchases:write',
  },
  {
    to: '/estoque',
    label: 'Estoque',
    icon: Boxes,
    permission: 'inventory:read',
  },
  {
    to: '/producao',
    label: 'Produção',
    icon: CookingPot,
    permission: 'production:read',
  },
  {
    to: '/vendas',
    label: 'Vendas',
    icon: ShoppingBag,
    permission: 'sales:write',
  },
  {
    to: '/despesas',
    label: 'Despesas',
    icon: Wallet,
    permission: 'expenses:read',
  },
  {
    to: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    permission: 'reports:financial:read',
  },
  {
    to: '/parametros',
    label: 'Parâmetros',
    icon: Settings,
    permission: 'access:manage',
  },
  {
    to: '/plano-de-acao',
    label: 'Plano de ação',
    icon: ClipboardList,
    permission: 'access:manage',
  },
] as const

export function ManagementLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const router = useRouter()
  const signOut = useServerFn(logout)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const { appRole } = rootRoute.useRouteContext()
  const visibleNavigation = appRole
    ? navigation.filter((item) =>
        hasPermission(appRole, item.permission as Permission),
      )
    : []

  async function leave() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      const result = await signOut()
      if (!result.ok) {
        setSignOutError(
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Não foi possível encerrar a sessão. Tente novamente.',
        )
        return
      }
      await router.navigate({
        to: '/login',
        search: { token: undefined },
      })
    } catch {
      setSignOutError('Não foi possível encerrar a sessão. Tente novamente.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f4ee] text-[#321b13]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-6 border-b border-[#e8dbce] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3 no-underline"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4a2114] text-lg font-black text-[#f7bc76]">
                C
              </span>
              <span>
                <span className="block text-sm font-bold text-[#4a2114]">
                  Seus Brownies
                </span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#b8673b]">
                  Cacau
                </span>
              </span>
            </Link>
          </div>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Navegação do cadastro"
          >
            {visibleNavigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: 'bg-[#4a2114] text-white' }}
                inactiveProps={{
                  className: 'bg-white text-[#725443] hover:bg-[#f5e9df]',
                }}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold no-underline transition"
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#725443] transition hover:bg-[#f5e9df] disabled:opacity-60"
              type="button"
              onClick={() => void leave()}
              disabled={signingOut}
            >
              <LogOut size={16} />
              {signingOut ? 'Saindo...' : 'Sair'}
            </button>
          </nav>
          {signOutError ? (
            <p className="text-sm text-[#75411f]">{signOutError}</p>
          ) : null}
        </header>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ad572b]">
            Cadastro
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#846859]">
            {description}
          </p>
        </section>

        <section className="mt-8">{children}</section>
      </div>
    </main>
  )
}
