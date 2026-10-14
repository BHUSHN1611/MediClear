import api from './api'

export const checklistService = {
  /**
   * Generates an actionable checklist grounded in the document.
   */
  async generateChecklist(documentId, language = 'en') {
    const response = await api.post(`/checklists/${documentId}/generate`, {
      language,
    })
    return response.data
  },

  /**
   * Retrieves the checklist for a document.
   */
  async getChecklist(documentId, language = 'en') {
    const response = await api.get(`/checklists/${documentId}`, {
      params: { language },
    })
    return response.data
  },

  /**
   * Toggles completion status of a checklist item.
   */
  async toggleItem(documentId, itemId, isCompleted) {
    const response = await api.patch(
      `/checklists/${documentId}/items/${itemId}`,
      { isCompleted }
    )
    return response.data
  },
}

export default checklistService
