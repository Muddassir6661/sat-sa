import { useCallback, useEffect, useState } from 'react'
import { generateDataset, getAlerts, getEntities } from './api/client'
import Dashboard from './pages/Dashboard'
import DatasetView from './pages/DatasetView'
import EntityDetail from './pages/EntityDetail'

export default function App() {
  const [entities, setEntities] = useState([])
  const [alerts, setAlerts] = useState([])
  const [tab, setTab] = useState('findings')
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [findings, dataset] = await Promise.all([getEntities(), getAlerts()])
      setEntities(findings.entities)
      setAlerts(dataset.alerts)
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
      const findings = await generateDataset()
      setEntities(findings.entities)
      // The dataset was replaced server-side, so the cached rows are stale.
      const dataset = await getAlerts()
      setAlerts(dataset.alerts)
      setSelectedId(null)
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

      <nav className="tabs">
        <button
          className={tab === 'findings' ? 'tab active' : 'tab'}
          onClick={() => setTab('findings')}
        >
          Findings
        </button>
        <button
          className={tab === 'dataset' ? 'tab active' : 'tab'}
          onClick={() => setTab('dataset')}
        >
          Dataset <span className="tab-count">{alerts.length}</span>
        </button>
      </nav>

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
        (tab === 'dataset' ? (
          <DatasetView alerts={alerts} />
        ) : selected ? (
          <EntityDetail entity={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <Dashboard entities={entities} onSelect={setSelectedId} />
        ))}
    </div>
  )
}
