import { useState } from 'react'

// Horizontal 100%-width stacked bar for a part-to-whole breakdown. Every
// segment's exact count/percent is always visible in the legend below the
// bar, so no value is gated behind hover — the tooltip only adds the
// per-segment hover/focus affordance the interaction spec calls for.
//
// Flexbox rather than SVG: percentage-width flex-basis plus a real CSS `gap`
// gives an exact pixel spacer between segments regardless of container width,
// which an SVG viewBox (unitless) can't do without separately tracking px vs.
// viewBox-unit gaps.
export default function StackedBar({ segments, height = 26 }) {
  const [hovered, setHovered] = useState(null)
  const total = segments.reduce((n, s) => n + s.value, 0)
  const visible = segments.filter((s) => s.value > 0)

  if (total === 0) {
    return <div className="empty">No data for this chart.</div>
  }

  const hoveredSegment = segments.find((s) => s.key === hovered)

  return (
    <div className="stacked-bar">
      <div className="stacked-bar-track" style={{ height }}>
        {visible.map((s) => {
          const pct = (s.value / total) * 100
          return (
            <div
              key={s.key}
              className="stacked-bar-seg"
              style={{ flexBasis: `${pct}%`, background: s.color, opacity: hovered && hovered !== s.key ? 0.55 : 1 }}
              tabIndex={0}
              role="img"
              aria-label={`${s.label}: ${s.value} (${pct.toFixed(0)}%)`}
              onPointerEnter={() => setHovered(s.key)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.key)}
              onBlur={() => setHovered(null)}
            />
          )
        })}
      </div>

      <div className="chart-tooltip-slot">
        {hoveredSegment && (
          <div className="chart-tooltip" role="status">
            <span className="tip-swatch" style={{ background: hoveredSegment.color }} />
            <span className="tip-value">{hoveredSegment.value}</span>
            <span className="tip-label">{hoveredSegment.label}</span>
            <span className="tip-pct">{((hoveredSegment.value / total) * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <ul className="stacked-bar-legend">
        {segments.map((s) => {
          const pct = ((s.value / total) * 100).toFixed(1)
          return (
            <li
              key={s.key}
              className={hovered === s.key ? 'active' : undefined}
              onPointerEnter={() => setHovered(s.key)}
              onPointerLeave={() => setHovered(null)}
            >
              <span className="tip-swatch" style={{ background: s.color }} />
              <span className="legend-label">{s.label}</span>
              <span className="legend-value">
                {s.value} <span className="legend-pct">({pct}%)</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
