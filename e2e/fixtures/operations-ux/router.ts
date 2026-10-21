import { purchaseData, workspace, refresh } from './state'

export const createFileRoute = (path: string) => (options: unknown) => ({
  options,
  fullPath: path,
  useLoaderData: () => (path === '/compras' ? purchaseData : workspace),
  useSearch: () => ({}),
})
export const useRouter = () => ({ invalidate: refresh })
export const useNavigate = () => async () => {}
