import api from './api'

export const documentService = {
  /**
   * Upload a medical document (multipart/form-data)
   */
  async uploadDocument(file) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },

  /**
   * Fetch document metadata
   */
  async getDocument(documentId) {
    const res = await api.get(`/documents/${documentId}`)
    return res.data
  },

  /**
   * Poll document processing status
   */
  async getDocumentStatus(documentId) {
    const res = await api.get(`/documents/${documentId}/status`)
    return res.data
  },

  /**
   * Trigger text and structured parameter extraction
   */
  async extractDocument(documentId) {
    const res = await api.post(`/documents/${documentId}/extract`)
    return res.data
  },

  /**
   * Fetch extracted structured data and uncertainty notes
   */
  async getExtractedData(documentId) {
    const res = await api.get(`/documents/${documentId}/extracted-data`)
    return res.data
  },

  /**
   * Submit user corrections to extracted clinical fields
   */
  async updateExtractedData(documentId, fields) {
    const res = await api.patch(`/documents/${documentId}/extracted-data`, {
      fields,
    })
    return res.data
  },

  /**
   * Delete document and all associated data
   */
  async deleteDocument(documentId) {
    const res = await api.delete(`/documents/${documentId}`)
    return res.data
  },
}
