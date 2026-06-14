import axios from 'axios'

const api = axios.create({ baseURL: '/' })

// ── Public ────────────────────────────────────────────────────────────────────

export const predictImage = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/predict', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const submitFeedback = (prediction_id, correct_label) =>
  api.post('/feedback', { prediction_id, correct_label })

export const getFeedbackSamples = () =>
  api.get('/feedback/samples')

// ── Admin helpers ─────────────────────────────────────────────────────────────

const ah = (token) => ({ headers: { 'X-Admin-Token': token } })

// Review queue
export const getReviewQueue   = (token)           => api.get('/retrain/review', ah(token))
export const getReviewCounts  = (token)           => api.get('/retrain/review/counts', ah(token))
export const reviewSample     = (id, approved, token) =>
  api.patch(`/retrain/review/${id}`, { approved }, ah(token))

// Retrain
export const startRetrain      = (token)          => api.post('/retrain/start', {}, ah(token))
export const getRetrainStatus  = (job_id, token)  => api.get(`/retrain/status/${job_id}`, ah(token))
export const getRetrainHistory = (token)          => api.get('/retrain/history', ah(token))
