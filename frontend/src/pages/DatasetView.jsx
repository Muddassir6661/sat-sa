import { useEffect, useMemo, useState } from 'react'
import AlertTable from '../components/AlertTable'

const PAGE_SIZE = 50
const SEARCH_FIELDS = ['alert_id', 'investigation_notes', 'asset_id', 'analyst_id']

const uniqueSorted = (alerts, key) => [...new Set(alerts.map((a) => a[key]))].sort()

export default function DatasetView({ alerts, focus, onClearFocus }) {
  const [entity, setEntity] = useState('')
  const [severity, setSeverity] = useState('')
  const [disposition, setDisposition] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cited = focus ? new Set(focus.alertIds) : null
    return alerts.filter((a) => {
      if (cited && !cited.has(a.alert_id)) return false
      if (entity && a.entity_id !== entity) return false
      if (severity && a.severity !== severity) return false
      if (disposition && a.disposition !== disposition) return false
      if (q && !SEARCH_FIELDS.some((f) => String(a[f] ?? '').toLowerCase().includes(q))) return false
      return true
    })
  }, [alerts, entity, severity, disposition, search, focus])

  useEffect(() => {
    setPage(1)
  }, [entity, severity, disposition, search, focus])

  // Arriving from a flag should show exactly what that flag cited, not an
  // intersection with filters left over from earlier browsing.
  useEffect(() => {
    if (focus) {
      setEntity(''); setSeverity(''); setDisposition(''); setSearch('')
    }
  }, [focus])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)
  const hasFilters = entity || severity || disposition || search

  return (
    <>
      {focus && (
        <div className="focus-banner">
          <span>
            Showing <strong>{focus.alertIds.length}</strong> alert
            {focus.alertIds.length === 1 ? '' : 's'} cited by{' '}
            <span className="mono">{focus.flagId}</span>
            <span className="focus-rule">{focus.rule}</span>
          </span>
          <button className="link-btn" onClick={onClearFocus}>
            Clear · show all {alerts.length}
          </button>
        </div>
      )}

      <div className="filters">
        <input
          className="search"
          placeholder="Search alert ID, notes, asset, analyst…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {uniqueSorted(alerts, 'entity_id').map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          {uniqueSorted(alerts, 'severity').map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={disposition} onChange={(e) => setDisposition(e.target.value)}>
          <option value="">All dispositions</option>
          {uniqueSorted(alerts, 'disposition').map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            className="link-btn"
            onClick={() => {
              setEntity(''); setSeverity(''); setDisposition(''); setSearch('')
            }}
          >
            Reset
          </button>
        )}
      </div>

      <AlertTable alerts={visible} highlightIds={focus?.alertIds} />

      <div className="pager">
        <span>
          {filtered.length === 0
            ? 'No matching alerts'
            : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          {filtered.length !== alerts.length && ` (filtered from ${alerts.length})`}
        </span>
        <span className="pager-controls">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span className="pageno">Page {page} of {pageCount}</span>
          <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </span>
      </div>
    </>
  )
}
