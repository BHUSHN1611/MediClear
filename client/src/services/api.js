import axios from 'axios'

/**
 * Single Axios client configured for MediClear API communications.
 * withCredentials: true ensures HTTP-only session cookies are transmitted on all cross-origin or proxy requests.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Global response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.error || error.message || 'Network error occurred',
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      status: error.response?.status,
    }
    return Promise.reject(customError)
  }
)

export default api
