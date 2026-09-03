export default function Badge({ label, color }) {
  return (
    <span className="badge" style={{ color }}>
      {label}
    </span>
  )
}
