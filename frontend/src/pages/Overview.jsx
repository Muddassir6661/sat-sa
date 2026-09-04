import Histogram from '../components/Histogram'
import StackedBar from '../components/StackedBar'
import { typeColor, typeLabel } from '../format'

const DISPOSITIONS = [
  { key: 'open', label: 'Open', color: 'var(--disposition-open)' },
  { key: 'closed', label: 'Closed', color: 'var(--disposition-closed)' },
  { key: 'escalated', label: 'Escalated', color: 'var(--disposition-escalated)' },
]

// Fixed minute buckets for closure_time_minutes. Boundaries sit near the
// rules engine's fast-closure thresholds (EXPECTED_MIN_CLOSURE * 0.35, ~5-11
// min depending on severity), so the leftmost bars roughly track "suspiciously
// fast" territory without mixing per-severity thresholds into one axis.
const TIME_BUCKETS = [
  { label: '0–5', test: (m) => m < 5 },
  { label: '5–15', test: (m) => m >= 5 && m < 15 },
  { label: '15–30', test: (m) => m >= 15 && m < 30 },
  { label: '30–60', test: (m) => m >= 30 && m < 60 },
  { label: '60–120', test: (m) => m >= 60 && m < 120 },
  { label: '120+', test: (m) => m >= 120 },
]

function tally(items, keyFn) {
  const counts = new Map()
  for (const item of items) {
    const k = keyFn(item)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

export default function Overview({ entities, alerts }) {
  const allFlags = entities.flatMap((e) => e.flags)
  const flagCounts = tally(allFlags, (f) => f.flag_type)
  const flagSegments = [...flagCounts.entries()].map(([type, value]) => ({
    key: type,
    label: typeLabel(type),
    value,
    color: typeColor(type),
  }))

  const dispositionCounts = tally(alerts, (a) => a.disposition)
  const dispositionSegments = DISPOSITIONS.map((d) => ({
    ...d,
    value: dispositionCounts.get(d.key) ?? 0,
  }))

  const closureTimes = alerts
    .map((a) => a.closure_time_minutes)
    .filter((m) => m !== null && m !== undefined)
  const timeBuckets = TIME_BUCKETS.map((b) => ({
    label: b.label,
    count: closureTimes.filter(b.test).length,
  }))

  return (
    <div className="overview-grid">
      <div className="chart-card">
        <h3 className="chart-title">Flag Type Breakdown</h3>
        <p className="chart-caption">
          {allFlags.length} finding{allFlags.length === 1 ? '' : 's'} across{' '}
          {entities.length} entities, by category
        </p>
        <StackedBar segments={flagSegments} />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Alert Disposition</h3>
        <p className="chart-caption">How all {alerts.length} alerts were resolved</p>
        <StackedBar segments={dispositionSegments} />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Closure Time Distribution</h3>
        <p className="chart-caption">
          {closureTimes.length} closed/escalated alerts, by minutes-to-close — open alerts
          have no closure time and are excluded. The fast-closure rule flags patterns near
          the left edge.
        </p>
        <Histogram buckets={timeBuckets} color="var(--disposition-open)" />
      </div>
    </div>
  )
}
