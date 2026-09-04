import { useState } from 'react'

const BAR_MAX = 24 // px, per the mark spec — never fill the slot

// Single-hue vertical bar histogram. Length carries magnitude, so every bar
// shares one color rather than a stepped ramp (no heatmap grid here to
// justify per-bar shading).
export default function Histogram({ buckets, color, height = 140 }) {
  const [hovered, setHovered] = useState(null)
  const max = Math.max(...buckets.map((b) => b.count), 1)
  const total = buckets.reduce((n, b) => n + b.count, 0)

  if (total === 0) {
    return <div className="empty">No data for this chart.</div>
  }

  return (
    <div className="histogram">
      <div className="histogram-plot" style={{ height }}>
        {buckets.map((b, i) => {
          const barHeight = Math.max((b.count / max) * height, b.count > 0 ? 3 : 0)
          // Count fits above the bar unless the bar is tall enough to crowd the
          // plot ceiling; in that case it moves to the tooltip instead of clipping.
          const labelFits = barHeight < height - 16
          return (
            <div
              key={b.label}
              className="histogram-col"
              tabIndex={0}
              role="img"
              aria-label={`${b.label}: ${b.count} alert${b.count === 1 ? '' : 's'}`}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            >
              {labelFits && b.count > 0 && <span className="histogram-count">{b.count}</span>}
              <div
                className="histogram-bar"
                style={{
                  height: barHeight,
                  maxWidth: BAR_MAX,
                  background: color,
                  opacity: hovered !== null && hovered !== i ? 0.55 : 1,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="histogram-axis">
        {buckets.map((b) => (
          <span key={b.label} className="histogram-tick">{b.label}</span>
        ))}
      </div>

      <div className="chart-tooltip-slot">
        {hovered !== null && (
          <div className="chart-tooltip" role="status">
            <span className="tip-swatch" style={{ background: color }} />
            <span className="tip-value">{buckets[hovered].count}</span>
            <span className="tip-label">{buckets[hovered].label} min</span>
          </div>
        )}
      </div>
    </div>
  )
}
