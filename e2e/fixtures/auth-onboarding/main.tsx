import { useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { Route } from '../../../src/routes/login'
import { requireDefined } from '../../../src/lib/required-value'
import { selectNewAccount, snapshot, subscribe } from './state'
import '../../../src/styles.css'

const Page = requireDefined(Route.options.component)
function Preview() {
  const calls = useSyncExternalStore(subscribe, snapshot)
  return (
    <>
      <button onClick={selectNewAccount}>Simular conta nova</button>
      <output aria-label="Chamadas simuladas">{calls}</output>
      <Page />
    </>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Raiz do ensaio indisponível')
createRoot(root).render(<Preview />)
