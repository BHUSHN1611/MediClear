import api from './api'

export const questionService = {
  /**
   * Generates consultation questions grounded in the document.
   */
  async generateQuestions(documentId, language = 'en') {
    const response = await api.post(`/questions/${documentId}/generate`, {
      language,
    })
    return response.data
  },

  /**
   * Retrieves consultation questions for a document.
   */
  async getQuestions(documentId, language = 'en') {
    const response = await api.get(`/questions/${documentId}`, {
      params: { language },
    })
    return response.data
  },
}

export default questionService
