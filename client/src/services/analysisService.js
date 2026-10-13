import api from './api'

export const analysisService = {
  /**
   * Triggers plain-language explanation generation
   */
  async generateExplanation(documentId, language = 'en') {
    const res = await api.post(`/analysis/${documentId}/explain`, { language })
    return res.data
  },

  /**
   * Fetches educational clinical summary, extracted facts, and safety notices
   */
  async getAnalysisSummary(documentId, language = 'en') {
    const res = await api.get(`/analysis/${documentId}/summary`, {
      params: { language },
    })
    return res.data
  },

  /**
   * Fetches medical glossary terms and simplified definitions
   */
  async getAnalysisTerms(documentId, language = 'en') {
    const res = await api.get(`/analysis/${documentId}/terms`, {
      params: { language },
    })
    return res.data
  },

  /**
   * Evaluates text against deterministic clinical safety rules
   */
  async checkSafety(text, language = 'en') {
    const res = await api.post('/safety/check', { text, language })
    return res.data
  },
}

export default analysisService
