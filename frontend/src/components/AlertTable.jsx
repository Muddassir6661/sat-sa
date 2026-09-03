import { alertSeverityColor, formatCell, humanize, orderColumns } from '../format'

export default function AlertTable({ alerts, highlightIds }) {
  if (alerts.length === 0) {
    return <div className="empty">No alerts match these filters.</div>
  }

  const columns = orderColumns(Object.keys(alerts[0]))
  const highlight = highlightIds ? new Set(highlightIds) : null

  return (
    <div className="table-wrap">
      <table className="alert-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{humanize(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.alert_id} className={highlight?.has(a.alert_id) ? 'cited' : undefined}>
              {columns.map((c) => {
                const text = formatCell(c, a[c])
                return (
                  <td key={c} className={c === 'investigation_notes' ? 'notes' : undefined} title={text ?? ''}>
                    {text === null ? (
                      <span className="nil">—</span>
                    ) : c === 'severity' ? (
                      <span style={{ color: alertSeverityColor(a[c]), fontWeight: 600 }}>{text}</span>
                    ) : (
                      text
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
