const BANDS = [
  { min: 70, label: 'Critical', color: 'var(--high)' },
  { min: 40, label: 'Elevated', color: 'var(--medium)' },
  { min: 1, label: 'Low', color: 'var(--low)' },
  { min: 0, label: 'Clean', color: 'var(--clean)' },
]

export const riskBand = (score) => BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]

const TYPE_LABELS = {
  execution_gap: 'Execution Gap',
  negative_space: 'Negative Space',
  statistical_anomaly: 'Statistical Anomaly',
}

// Unknown types fall back to a humanised slug rather than rendering blank, so a
// new detection category shows up in the UI without a frontend change.
export const typeLabel = (type) => TYPE_LABELS[type] ?? humanize(type)

export const typeColor = (type) =>
  TYPE_LABELS[type] ? `var(--${type})` : 'var(--muted)'

export const severityColor = (sev) => `var(--${sev}, var(--muted))`

const LABEL_OVERRIDES = { alert_ids: 'Alert IDs', z_score: 'Z-Score' }

export function humanize(key) {
  return (
    LABEL_OVERRIDES[key] ??
    String(key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

// Evidence values are heterogeneous across rules: arrays of alert ids, counts,
// floats, plain strings. Render every shape without special-casing the rule.
export function formatEvidence(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(2)
  return String(value)
}
