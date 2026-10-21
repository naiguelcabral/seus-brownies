import { recordNavigation } from './state'

export const createFileRoute = () => (options: unknown) => ({ options })
export const useLocation = () => ({ pathname: '/login' })
export const useRouter = () => ({
  navigate: async ({ to }: { to: string }) => recordNavigation(to),
})
export const redirect = () => {
  throw new Error('Guards não são executados neste ensaio de interface')
}
export const Outlet = () => null
