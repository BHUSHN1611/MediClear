import axios from 'axios'

const API_ORIGIN = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')

if (
  import.meta.env?.PROD &&
  !API_ORIGIN &&
  typeof window !== 'undefined' &&
  window.location?.hostname !== 'localhost' &&
  window.location?.hostname !== '127.0.0.1'
) {
  console.warn('VITE_API_URL is not set: API calls will go to this site, not the server.')
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

let inMemorySessionId = null

export function getSessionId() {
  try {
    const stored = localStorage.getItem('mc_session_id')
    if (stored) return stored
    const newId = generateUUID()
    localStorage.setItem('mc_session_id', newId)
    return newId
  } catch {
    if (!inMemorySessionId) {
      inMemorySessionId = generateUUID()
    }
    return inMemorySessionId
  }
}

/**
 * Normalizes Axios errors into a consistent { message, code, status } shape.
 * Ensures `message` is ALWAYS a string (never an object or raw HTML).
 */
export function normalizeApiError(error) {
  const data = error?.response?.data
  let code = 'UNKNOWN_ERROR'
  let message =
    typeof error?.message === 'string' && error.message.trim()
      ? error.message
      : 'Network error occurred'

  if (data && typeof data === 'object') {
    const e = data.error
    if (typeof e === 'string') {
      message = e
    } else if (e && typeof e === 'object') {
      if (typeof e.message === 'string') message = e.message
      if (e.code != null) code = String(e.code)
    } else if (typeof data.message === 'string') {
      message = data.message
    }
    if (typeof data.code === 'string') {
      code = data.code
    }
  } else if (typeof data === 'string' && data.length > 0 && !data.trim().startsWith('<')) {
    message = data.slice(0, 200)
  }

  const status = error?.response?.status
  return { message, code, status }
}

/**
 * Single Axios client configured for MediClear API communications.
 * - baseURL: empty API_ORIGIN keeps relative path for dev proxy; full URL for direct cross-origin API calls.
 * - withCredentials: true only when API_ORIGIN is empty (dev proxy / same-origin); false when cross-origin.
 * - timeout: 120000ms to accommodate Render cold starts and Gemini analysis.
 * - x-session-id header: attached on all requests as cross-site fallback.
 */
export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  withCredentials: !API_ORIGIN,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach x-session-id header to every request (including multipart upload)
api.interceptors.request.use((config) => {
  config.headers = config.headers || {}
  config.headers['x-session-id'] = getSessionId()
  return config
})

// Global response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
)

export default api
