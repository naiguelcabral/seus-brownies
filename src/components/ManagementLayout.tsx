import {
  Boxes,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingBag,
  Tags,
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const navigation = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/compras', label: 'Compras', icon: ReceiptText },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/despesas', label: 'Despesas', icon: Wallet },
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
            {navigation.map(({ to, label, icon: Icon }) => (
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
          </nav>
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
