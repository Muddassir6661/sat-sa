export default function SummaryBar({ entities }) {
  const flagged = entities.filter((e) => e.flags.length > 0)
  const totalFlags = entities.reduce((n, e) => n + e.flags.length, 0)
  const negativeSpace = entities.reduce(
    (n, e) => n + e.flags.filter((f) => f.flag_type === 'negative_space').length,
    0,
  )

  const stats = [
    { num: entities.length, lbl: 'Entities Assessed' },
    { num: flagged.length, lbl: 'Entities Flagged', color: flagged.length ? 'var(--medium)' : undefined },
    { num: totalFlags, lbl: 'Total Findings' },
    { num: negativeSpace, lbl: 'Negative Space', color: negativeSpace ? 'var(--negative_space)' : undefined },
  ]

  return (
    <div className="summary">
      {stats.map((s) => (
        <div className="stat" key={s.lbl}>
          <div className="num" style={{ color: s.color }}>{s.num}</div>
          <div className="lbl">{s.lbl}</div>
        </div>
      ))}
    </div>
  )
}
