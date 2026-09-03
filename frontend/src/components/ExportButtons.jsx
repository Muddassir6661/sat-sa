import { exportCsv, exportJson } from '../export'

export default function ExportButtons({ entities }) {
  const flagCount = entities.reduce((n, e) => n + e.flags.length, 0)
  if (flagCount === 0) return null

  return (
    <div className="export">
      <span className="export-label">Export {flagCount} findings</span>
      <button className="link-btn" onClick={() => exportCsv(entities)}>CSV</button>
      <span className="export-sep">·</span>
      <button className="link-btn" onClick={() => exportJson(entities)}>JSON</button>
    </div>
  )
}
