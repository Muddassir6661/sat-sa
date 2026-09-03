const CSV_COLUMNS = [
  'entity_id',
  'risk_score',
  'flag_id',
  'rule_triggered',
  'flag_type',
  'severity_of_finding',
  'reason',
  'evidence',
]

// RFC 4180: wrap in quotes and double any embedded quote. Reason text contains
// commas, apostrophes and parenthetical quotes, so this is not optional.
function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function findingsToCsv(entities) {
  const rows = [CSV_COLUMNS.join(',')]
  for (const e of entities) {
    for (const f of e.flags) {
      rows.push(
        [
          e.entity_id,
          Math.round(e.risk_score),
          f.flag_id,
          f.rule_triggered,
          f.flag_type,
          f.severity_of_finding,
          f.reason,
          JSON.stringify(f.evidence ?? {}),
        ]
          .map(csvCell)
          .join(','),
      )
    }
  }
  return rows.join('\r\n')
}

function download(content, filename, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export const exportCsv = (entities) =>
  download(findingsToCsv(entities), `sat-sa-findings-${stamp()}.csv`, 'text/csv;charset=utf-8')

export const exportJson = (entities) =>
  download(
    JSON.stringify({ entities }, null, 2),
    `sat-sa-findings-${stamp()}.json`,
    'application/json',
  )
