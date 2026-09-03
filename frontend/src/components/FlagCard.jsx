import Badge from './Badge'
import { formatEvidence, humanize, severityColor, typeColor, typeLabel } from '../format'

export default function FlagCard({ flag }) {
  const entries = Object.entries(flag.evidence ?? {})

  return (
    <div className="flag-card" style={{ '--type-color': typeColor(flag.flag_type) }}>
      <div className="flag-top">
        <Badge label={typeLabel(flag.flag_type)} color={typeColor(flag.flag_type)} />
        <Badge
          label={`${flag.severity_of_finding} severity`}
          color={severityColor(flag.severity_of_finding)}
        />
        <span className="rule-name">{flag.rule_triggered}</span>
      </div>

      <p className="reason">{flag.reason}</p>

      {entries.length > 0 && (
        <div className="evidence">
          <div className="evidence-label">Evidence</div>
          {entries.map(([key, value]) => (
            <div className="ev-item" key={key}>
              <span className="ev-key">{humanize(key)}</span>
              <span className="ev-val">{formatEvidence(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
