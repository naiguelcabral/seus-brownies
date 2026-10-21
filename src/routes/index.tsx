import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ManagementLayout } from '#/components/ManagementLayout'
import { DashboardOverview } from '#/features/dashboard/DashboardOverview'
import { getDashboard } from '#/features/operations/functions'

export const Route = createFileRoute('/')({
  loader: () => getDashboard(),
  component: DashboardPage,
  pendingComponent: DashboardPending,
  pendingMs: 300,
  errorComponent: DashboardError,
})

function DashboardPage() {
  const dashboard = Route.useLoaderData()
  const { appRole } = Route.useRouteContext()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      await router.invalidate({ sync: true })
    } catch {
      setRefreshError(
        'Não foi possível atualizar o painel. Tente novamente em instantes.',
      )
    } finally {
      setRefreshing(false)
    }
  }
  return (
    <ManagementLayout
      title="Visão geral"
      description="Veja os principais números, confira o que precisa de atenção e acesse as tarefas da operação."
    >
      <DashboardOverview
        data={dashboard}
        role={appRole}
        refreshing={refreshing}
        refreshError={refreshError}
        onRefresh={() => void refresh()}
      />
    </ManagementLayout>
  )
}
function DashboardPending() {
  return (
    <ManagementLayout
      title="Visão geral"
      description="Carregando os registros da operação."
    >
      <p
        role="status"
        className="rounded-2xl border border-[#ecdfd4] bg-white p-5 text-sm text-[#846859]"
      >
        Atualizando indicadores, estoque e últimos registros…
      </p>
    </ManagementLayout>
  )
}
function DashboardError() {
  const router = useRouter()
  return (
    <ManagementLayout
      title="Visão geral"
      description="Não foi possível carregar os dados do painel."
    >
      <section
        role="alert"
        className="rounded-2xl border border-[#e7c9b8] bg-[#fff5ed] p-5"
      >
        <h2 className="font-bold">O painel está indisponível no momento</h2>
        <p className="mt-2 text-sm text-[#846859]">
          Tente carregar novamente para consultar os registros atuais.
        </p>
        <button
          type="button"
          onClick={() => void router.invalidate()}
          className="mt-4 rounded-lg border border-[#75411f] px-4 py-2 text-sm font-bold"
        >
          Tentar novamente
        </button>
      </section>
    </ManagementLayout>
  )
}
