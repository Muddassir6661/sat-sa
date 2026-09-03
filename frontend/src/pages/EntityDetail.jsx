import Badge from '../components/Badge'
import FlagCard from '../components/FlagCard'
import { riskBand } from '../format'

export default function EntityDetail({ entity, onBack }) {
  const score = Math.round(entity.risk_score)
  const band = riskBand(score)

  return (
    <>
      <button className="back" onClick={onBack}>
        ← All entities
      </button>

      <div className="detail-head" style={{ '--band': band.color }}>
        <h2>{entity.entity_id}</h2>
        <Badge label={band.label} color={band.color} />
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="detail-score">{score}</div>
          <div className="lbl" style={{ fontSize: 10, color: 'var(--muted)' }}>
            RISK SCORE
          </div>
        </div>
      </div>

      {entity.flags.length === 0 ? (
        <div className="empty">
          No findings for {entity.entity_id}. Alert handling matched expected supervisory patterns
          across every check.
        </div>
      ) : (
        entity.flags.map((f) => <FlagCard key={f.flag_id} flag={f} />)
      )}
    </>
  )
}
