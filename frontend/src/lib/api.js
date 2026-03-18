import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// Datasets
export const datasetsApi = {
  list: () => api.get('/datasets/'),
  get: (id) => api.get(`/datasets/${id}`),
  create: (data) => api.post('/datasets/', data),
  update: (id, data) => api.put(`/datasets/${id}`, data),
  delete: (id) => api.delete(`/datasets/${id}`),
  addRecord: (id, data) => api.post(`/datasets/${id}/records`, data),
  deleteRecord: (datasetId, recordId) => api.delete(`/datasets/${datasetId}/records/${recordId}`),
  getVersions: (id) => api.get(`/datasets/${id}/versions`),
  stats: () => api.get('/datasets/stats/summary'),
}

// Test Cases
export const testCasesApi = {
  list: () => api.get('/testcases/'),
  get: (id) => api.get(`/testcases/${id}`),
  create: (data) => api.post('/testcases/', data),
  update: (id, data) => api.put(`/testcases/${id}`, data),
  delete: (id) => api.delete(`/testcases/${id}`),
  getExecutions: (id) => api.get(`/testcases/${id}/executions`),
  stats: () => api.get('/testcases/stats/summary'),
}

// Execution
export const executionApi = {
  run: (tcId, targetUrl = null) => api.post(`/execution/${tcId}/run`, { target_url: targetUrl }),
  get: (execId) => api.get(`/execution/${execId}`),
  getAll: (limit = 50) => api.get(`/execution/all?limit=${limit}`),
}

// Reports
export const reportsApi = {
  generate: (tcId) => api.get(`/reports/generate/${tcId}`),
  list: () => api.get('/reports/all'),
  summary: () => api.get('/reports/summary'),
}

// Manual
export const manualApi = {
  list: () => api.get('/manual/'),
  create: (data) => api.post('/manual/', data),
  updateResult: (id, result, notes) => api.put(`/manual/${id}/result?result=${result}&notes=${encodeURIComponent(notes)}`),
  delete: (id) => api.delete(`/manual/${id}`),
}

// WebSocket URL
export const wsUrl = (execId) => `ws://localhost:8000/api/execution/${execId}/ws`

export default api
