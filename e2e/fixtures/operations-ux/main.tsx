import { useState, useSyncExternalStore } from 'react'
import { requireDefined } from '../../../src/lib/required-value'
import { createRoot } from 'react-dom/client'
import { Route as PurchasesRoute } from '../../../src/routes/compras'
import { Route as ProductionRoute } from '../../../src/routes/producao'
import { snapshot, subscribe, setMode } from './state'
import './preview.css'

const PurchasePage = requireDefined(PurchasesRoute.options.component)
const ProductionPage = requireDefined(ProductionRoute.options.component)
function Preview() {
  const [page, setPage] = useState('purchase')
  const calls = useSyncExternalStore(subscribe, snapshot)
  return (
    <>
      <nav>
        <button onClick={() => setPage('purchase')}>Ensaio Compras</button>
        <button onClick={() => setPage('production')}>Ensaio Produção</button>
        <button onClick={() => setMode('save')}>Falhar gravação</button>
        <button onClick={() => setMode('refresh')}>Falhar atualização</button>
        <button onClick={() => setMode('')}>Restabelecer</button>
      </nav>
      <pre
        className="whitespace-pre-wrap break-all"
        aria-label="Chamadas simuladas"
      >
        {calls}
      </pre>
      {page === 'purchase' ? <PurchasePage /> : <ProductionPage />}
    </>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Raiz do ensaio indisponível')
createRoot(root).render(<Preview />)
