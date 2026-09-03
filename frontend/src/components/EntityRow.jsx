import { riskBand } from '../format'

export default function EntityRow({ entity, onSelect }) {
  const score = Math.round(entity.risk_score)
  const band = riskBand(score)
  const count = entity.flags.length

  return (
    <button
      className="entity-row"
      style={{ '--band': band.color }}
      onClick={() => onSelect(entity.entity_id)}
      aria-label={`${entity.entity_id}, risk ${score}, ${count} findings`}
    >
      <span className="entity-id">{entity.entity_id}</span>

      <span className="track">
        <span className="fill" style={{ width: `${Math.max(score, 2)}%` }} />
      </span>

      <span className="score">{score}</span>
      <span className="flagcount">
        {count === 0 ? 'no findings' : `${count} finding${count > 1 ? 's' : ''}`}
      </span>
      <span className="chev">›</span>
    </button>
  )
}
