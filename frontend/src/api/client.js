async function request(path, options) {
  const res = await fetch(path, options)
  if (!res.ok) {
    // FastAPI's HTTPException body is {"detail": "..."} -- surface that
    // clean message when present, since it's usually more useful than a
    // bare status code (e.g. "CSV is missing required columns: ...").
    const detail = await res.json().then((b) => b.detail).catch(() => null)
    throw new Error(detail || `${options?.method ?? 'GET'} ${path} failed (${res.status})`)
  }
  return res.json()
}

export const getEntities = () => request('/api/entities')

export const getEntity = (entityId) => request(`/api/entities/${entityId}`)

export const getAlerts = () => request('/api/alerts')

export const generateDataset = () => request('/api/generate-dataset', { method: 'POST' })

export function uploadDataset(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload-dataset', { method: 'POST', body: form })
}
