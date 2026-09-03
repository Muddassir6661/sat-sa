import EntityRow from '../components/EntityRow'
import SummaryBar from '../components/SummaryBar'

export default function Dashboard({ entities, onSelect }) {
  // The API already sorts by risk_score desc; sort defensively so the ranking
  // is guaranteed regardless of source.
  const ranked = [...entities].sort((a, b) => b.risk_score - a.risk_score)
  const flagged = ranked.filter((e) => e.flags.length > 0)
  const clean = ranked.filter((e) => e.flags.length === 0)

  return (
    <>
      <SummaryBar entities={entities} />

      <p className="section-label">Requires Attention — ranked by risk</p>
      {flagged.length === 0 ? (
        <div className="empty">No findings in this dataset. Every entity passed all checks.</div>
      ) : (
        flagged.map((e) => <EntityRow key={e.entity_id} entity={e} onSelect={onSelect} />)
      )}

      {clean.length > 0 && (
        <>
          <p className="section-label" style={{ marginTop: 28 }}>
            No Findings — {clean.length} entities
          </p>
          {clean.map((e) => (
            <EntityRow key={e.entity_id} entity={e} onSelect={onSelect} />
          ))}
        </>
      )}
    </>
  )
}
