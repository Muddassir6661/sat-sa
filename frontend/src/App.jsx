import { useCallback, useEffect, useState } from 'react'
import { generateDataset, getEntities } from './api/client'
import Dashboard from './pages/Dashboard'
import EntityDetail from './pages/EntityDetail'

export default function App() {
  const [entities, setEntities] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await getEntities()
      setEntities(data.entities)
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const data = await generateDataset()
      setEntities(data.entities)
      setSelectedId(null) // findings are for a new dataset; the old entity view is stale
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  const selected = entities.find((e) => e.entity_id === selectedId)

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <h1>
            <span className="dot" />
            SAT-SA
          </h1>
          <p>Supervisory Analytics Tool for SOC Assessment</p>
        </div>
        <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
          {generating && <span className="spinner" />}
          {generating ? 'Generating…' : 'Generate New Dataset'}
        </button>
      </header>

      {status === 'loading' && <div className="state">Running detection…</div>}

      {status === 'error' && (
        <div className="state error">
          {error}
          <div style={{ color: 'var(--muted)', marginTop: 8, fontSize: 13 }}>
            Is the backend running on port 8000?
          </div>
        </div>
      )}

      {status === 'ready' &&
        (selected ? (
          <EntityDetail entity={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <Dashboard entities={entities} onSelect={setSelectedId} />
        ))}
    </div>
  )
}
