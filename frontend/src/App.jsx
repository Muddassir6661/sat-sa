import { useCallback, useEffect, useState } from 'react'
import { generateDataset, getAlerts, getEntities, uploadDataset } from './api/client'
import Dashboard from './pages/Dashboard'
import DatasetView from './pages/DatasetView'
import EntityDetail from './pages/EntityDetail'
import Overview from './pages/Overview'

export default function App() {
  const [entities, setEntities] = useState([])
  const [alerts, setAlerts] = useState([])
  const [tab, setTab] = useState('findings')
  const [focus, setFocus] = useState(null) // { alertIds, flagId, scrollTo } from a flag's evidence
  const [selectedId, setSelectedId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
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

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    // Reset now (not just after) so picking the same file twice in a row
    // still fires onChange the second time.
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      const findings = await uploadDataset(file)
      setEntities(findings.entities)
      const dataset = await getAlerts()
      setAlerts(dataset.alerts)
      setSelectedId(null)
      setFocus(null)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleViewAlerts(alertIds, flag) {
    setFocus({ alertIds, flagId: flag.flag_id, rule: flag.rule_triggered })
    setTab('dataset')
  }

  function switchTab(next) {
    if (next === 'findings') setFocus(null)
    setTab(next)
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
        <div className="data-actions">
          <button className="generate-btn" onClick={handleGenerate} disabled={generating || uploading}>
            {generating && <span className="spinner" />}
            {generating ? 'Generating…' : 'Generate New Dataset'}
          </button>
          <label className={`generate-btn upload-btn${uploading ? ' disabled' : ''}`}>
            {uploading && <span className="spinner" />}
            {uploading ? 'Processing…' : 'Upload Dataset'}
            <input
              type="file"
              accept=".csv"
              onChange={handleUpload}
              disabled={generating || uploading}
              hidden
            />
          </label>
        </div>
      </header>

      {uploadError && (
        <div className="upload-error">
          <strong>Upload failed:</strong> {uploadError}
          <button className="link-btn" onClick={() => setUploadError(null)}>Dismiss</button>
        </div>
      )}

      <nav className="tabs">
        <button
          className={tab === 'findings' ? 'tab active' : 'tab'}
          onClick={() => switchTab('findings')}
        >
          Findings
        </button>
        <button
          className={tab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => switchTab('overview')}
        >
          Overview
        </button>
        <button
          className={tab === 'dataset' ? 'tab active' : 'tab'}
          onClick={() => switchTab('dataset')}
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
          <DatasetView alerts={alerts} focus={focus} onClearFocus={() => setFocus(null)} />
        ) : tab === 'overview' ? (
          <Overview entities={entities} alerts={alerts} />
        ) : selected ? (
          <EntityDetail
            entity={selected}
            onBack={() => setSelectedId(null)}
            onViewAlerts={handleViewAlerts}
          />
        ) : (
          <Dashboard entities={entities} onSelect={setSelectedId} />
        ))}
    </div>
  )
}
