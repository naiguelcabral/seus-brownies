import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CategoryEditor } from '../../../src/features/catalog/CategoryEditor'
import { LocationEditor } from '../../../src/features/locations/LocationEditor'
import './preview.css'

function Preview() {
  const [mode, setMode] = useState<'category' | 'location' | null>(null)
  const [edit, setEdit] = useState(false)
  const [outcome, setOutcome] = useState('success')
  const [calls, setCalls] = useState(0)
  const [saved, setSaved] = useState('')
  async function save(values: unknown) {
    setCalls((previous) => previous + 1)
    if (outcome === 'slow')
      await new Promise((resolve) => setTimeout(resolve, 1000))
    if (outcome === 'retry' && calls === 0)
      throw new Error('Falha de ensaio. Tente novamente.')
    setSaved(JSON.stringify(values))
    setMode(null)
  }
  return (
    <main className="min-h-screen bg-[#faf6f0] p-5 text-[#4a2114]">
      <h1>Cadastros — ensaio local, sem banco</h1>
      <label>
        Resultado do salvamento
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          <option value="success">Sucesso</option>
          <option value="retry">Falhar uma vez</option>
          <option value="slow">Demorado</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={edit}
          onChange={(e) => setEdit(e.target.checked)}
        />
        Editar existente
      </label>
      <button onClick={() => setMode('category')}>Abrir categoria</button>
      <button onClick={() => setMode('location')}>Abrir local</button>
      <p data-testid="calls">{calls}</p>
      <p data-testid="saved">{saved}</p>
      {mode === 'category' ? (
        <CategoryEditor
          category={
            edit
              ? {
                  name: 'Brownies de ensaio',
                  description: 'Descrição preservada',
                }
              : null
          }
          onCancel={() => setMode(null)}
          onSave={save}
        />
      ) : null}
      {mode === 'location' ? (
        <LocationEditor
          location={
            edit
              ? {
                  name: 'Feira de ensaio',
                  classification: 'event',
                  frequency: 'Sábados',
                  notes: 'Observação preservada',
                }
              : null
          }
          onCancel={() => setMode(null)}
          onSave={save}
        />
      ) : null}
    </main>
  )
}
const root = document.getElementById('root')
if (root) createRoot(root).render(<Preview />)
