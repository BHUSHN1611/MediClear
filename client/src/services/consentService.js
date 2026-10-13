import api from './api'

export const consentService = {
  /**
   * Records explicit user consent on the backend
   */
  async recordConsent(data = {}) {
    const res = await api.post('/consents', {
      language: data.language || 'en',
      version: data.version || '1.0',
    })
    return res.data
  },

  /**
   * Checks current session consent status
   */
  async getConsentStatus() {
    const res = await api.get('/consents/status')
    return res.data
  },
}
