import Badge from './Badge'
import { formatEvidence, humanize, severityColor, typeColor, typeLabel } from '../format'

export default function FlagCard({ flag, onViewAlerts }) {
  const entries = Object.entries(flag.evidence ?? {})
  // Only two of the five rules cite alert ids; the rest have no rows to link to.
  const citedIds = Array.isArray(flag.evidence?.alert_ids) ? flag.evidence.alert_ids : null

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
              {key === 'alert_ids' && citedIds ? (
                <span className="ev-val ev-ids">
                  {citedIds.map((id) => (
                    <button key={id} className="alert-chip" onClick={() => onViewAlerts(citedIds, flag, id)}>
                      {id}
                    </button>
                  ))}
                </span>
              ) : (
                <span className="ev-val">{formatEvidence(value)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {citedIds && (
        <button className="link-btn view-all" onClick={() => onViewAlerts(citedIds, flag)}>
          View all {citedIds.length} cited alerts in the dataset →
        </button>
      )}
    </div>
  )
}
