import { Router } from 'express'
import {
  uploadDocument,
  getDocument,
  getDocumentStatus,
  deleteDocument,
  triggerExtraction,
  getExtractedData,
  updateExtractedData,
} from '../controllers/documentController.js'
import { uploadSingleFile, validateUploadedFile } from '../middleware/fileValidator.js'
import { uploadLimiter } from '../middleware/rateLimiter.js'

const router = Router()

// Upload medical document (protected by upload rate-limit, multer buffer, and magic byte validation)
router.post(
  '/upload',
  uploadLimiter,
  uploadSingleFile,
  validateUploadedFile,
  uploadDocument
)

// Document metadata and status
router.get('/:documentId', getDocument)
router.get('/:documentId/status', getDocumentStatus)

// Document extraction lifecycle
router.post('/:documentId/extract', triggerExtraction)
router.get('/:documentId/extracted-data', getExtractedData)
router.patch('/:documentId/extracted-data', updateExtractedData)

// Cascade document deletion
router.delete('/:documentId', deleteDocument)

export default router
