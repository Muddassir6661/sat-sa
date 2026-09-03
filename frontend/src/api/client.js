async function request(path, options) {
  const res = await fetch(path, options)
  if (!res.ok) {
    throw new Error(`${options?.method ?? 'GET'} ${path} failed (${res.status})`)
  }
  return res.json()
}

export const getEntities = () => request('/api/entities')

export const getEntity = (entityId) => request(`/api/entities/${entityId}`)

export const getAlerts = () => request('/api/alerts')

export const generateDataset = () => request('/api/generate-dataset', { method: 'POST' })
