import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { DashboardOverview } from '../../../src/features/dashboard/DashboardOverview'
import type { DashboardSnapshot } from '../../../src/features/dashboard/DashboardOverview'
import './preview.css'

const empty: DashboardSnapshot = {
  generatedAt: '2026-10-18T16:00:00Z',
  period: { start: '2026-10-01', end: '2026-11-01' },
  activeProducts: 37,
  productsWithStock: 0,
  monthExpenses: '0.00',
  lowStock: [],
  recentPurchases: [],
  recentSales: [],
}
const populated: DashboardSnapshot = {
  ...empty,
  productsWithStock: 12,
  monthExpenses: '1234.56',
  lowStock: Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    name: `Ingrediente de ensaio ${index + 1}`,
    unit: 'g',
    balance: '50.000',
    reorderPoint: '100.000',
  })),
  recentPurchases: [
    {
      id: 1,
      supplierName: 'Fornecedor de ensaio',
      purchasedAt: '2026-10-17',
      totalAmount: '125.50',
    },
  ],
  recentSales: [
    {
      id: 1,
      customerName: 'Cliente de ensaio',
      soldAt: new Date('2026-10-18T12:00:00Z'),
      status: 'draft',
      totalAmount: '50.00',
    },
    {
      id: 2,
      customerName: null,
      soldAt: new Date('2026-10-17T12:00:00Z'),
      status: 'cancelled',
      totalAmount: '20.00',
    },
  ],
}
function Preview() {
  const [sample, setSample] = useState('empty')
  const [busy, setBusy] = useState(false)
  const [role, setRole] = useState<'owner' | 'viewer'>('owner')
  return (
    <main className="mx-auto max-w-6xl bg-[#f8f4ee] p-5 text-[#321b13] sm:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Visão geral</h1>
        <p className="my-2 text-sm">Ensaio local com dados sintéticos.</p>
        <label>
          Dados do painel{' '}
          <select
            value={sample}
            onChange={(event) => setSample(event.target.value)}
          >
            <option value="empty">Sem operações</option>
            <option value="populated">Com operações</option>
          </select>
        </label>
        <label className="ml-4">
          Papel de ensaio{' '}
          <select
            value={role}
            onChange={() => setRole(role === 'owner' ? 'viewer' : 'owner')}
          >
            <option value="owner">Dono</option>
            <option value="viewer">Consulta sem ações</option>
          </select>
        </label>
      </header>
      <DashboardOverview
        data={sample === 'empty' ? empty : populated}
        role={role}
        refreshing={busy}
        refreshError={null}
        onRefresh={() => {
          setBusy(true)
          setTimeout(() => setBusy(false), 400)
        }}
      />
    </main>
  )
}
const route = createRootRoute()
const index = createRoute({
  getParentRoute: () => route,
  path: '/',
  component: Preview,
})
const router = createRouter({
  routeTree: route.addChildren([index]),
  history: createMemoryHistory({ initialEntries: ['/'] }),
})
const root = document.getElementById('root')
if (root) createRoot(root).render(<RouterProvider router={router} />)
