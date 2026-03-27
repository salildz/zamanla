import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9051/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Response interceptor: unwrap { success, data } envelope + normalize errors
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true && 'data' in response.data) {
      return { ...response, data: response.data.data }
    }
    return response
  },
  (error) => {
    if (error.response) {
      const errBody = error.response.data
      const message =
        errBody?.error?.message ||
        errBody?.message ||
        errBody?.error ||
        `Request failed with status ${error.response.status}`
      error.userMessage = message
    } else if (error.request) {
      error.userMessage = 'Network error — please check your connection.'
    } else {
      error.userMessage = error.message || 'An unexpected error occurred.'
    }
    return Promise.reject(error)
  }
)

// Sessions
export async function createSession(data) {
  const res = await api.post('/sessions', data)
  return res.data.session
}

export async function getSession(publicToken) {
  const res = await api.get(`/sessions/${publicToken}`)
  return res.data.session
}

export async function getAdminSession(adminToken) {
  const res = await api.get(`/sessions/admin/${adminToken}`)
  return res.data.session
}

export async function updateAdminSession(adminToken, data) {
  const res = await api.patch(`/sessions/admin/${adminToken}`, data)
  return res.data.session
}

export async function deleteSession(adminToken) {
  const res = await api.delete(`/sessions/admin/${adminToken}`)
  return res.data
}

export async function closeSession(adminToken) {
  const res = await api.post(`/sessions/admin/${adminToken}/close`)
  return res.data.session
}

export async function exportSession(adminToken, format = 'json') {
  const res = await api.get(`/sessions/admin/${adminToken}/export`, {
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json',
  })
  return res.data
}

// Participants
export async function joinSession(publicToken, data) {
  const res = await api.post(`/sessions/${publicToken}/participants`, data)
  return res.data.participant
}

export async function getParticipant(publicToken, editToken) {
  const res = await api.get(`/sessions/${publicToken}/participants/${editToken}`)
  return { ...res.data.participant, rules: res.data.rules, slots: res.data.slots }
}

export async function saveAvailability(publicToken, editToken, data) {
  const res = await api.put(`/sessions/${publicToken}/participants/${editToken}`, data)
  return { ...res.data.participant, rules: res.data.rules, slots: res.data.slots }
}

// Results
export async function getResults(publicToken) {
  const res = await api.get(`/sessions/${publicToken}/results`)
  return res.data.slots
}

export default api
