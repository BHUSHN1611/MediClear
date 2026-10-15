import { dataRepository } from '../services/dataRepository.js'
import { generateDocumentChecklist } from '../services/checklistService.js'
import {
  GenerationRequestSchema,
  ChecklistToggleSchema,
} from '../validators/aiOutputSchemas.js'

/**
 * POST /api/v1/checklists/:documentId/generate
 * Generates an actionable checklist grounded in extracted document instructions.
 */
export async function generateChecklist(req, res, next) {
  try {
    const { documentId } = req.params
    const document = await dataRepository.findDocumentById(documentId)

    if (!document) {
      return res.status(404).json({
        error: 'Document not found.',
        code: 'DOCUMENT_NOT_FOUND',
      })
    }

    // Session Ownership Enforcement
    if (document.sessionId !== req.sessionId) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to access this document.',
        code: 'UNAUTHORIZED_ACCESS',
      })
    }

    // Consent Verification
    const consent = await dataRepository.findConsentBySession(req.sessionId)
    if (!consent) {
      return res.status(403).json({
        error: 'Active patient consent is required before generating action checklists.',
        code: 'CONSENT_REQUIRED',
      })
    }

    // Guard: Rejected documents refuse generation
    if (document.status === 'rejected') {
      return res.status(422).json({
        error: 'Cannot generate checklist for a rejected document.',
        code: 'DOCUMENT_REJECTED',
        reason: document.rejectionReason,
      })
    }

    // Validate request body
    const parseResult = GenerationRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid generation request parameters.',
        details: parseResult.error.issues,
        code: 'INVALID_REQUEST_PARAMETERS',
      })
    }

    const { language } = parseResult.data

    // Check extracted data availability
    const extractedData = await dataRepository.findExtractedDataByDocument(documentId)
    if (!extractedData) {
      return res.status(400).json({
        error: 'Document has not been extracted yet. Extraction is required before generating a checklist.',
        code: 'EXTRACTION_REQUIRED',
      })
    }

    const checklist = await generateDocumentChecklist({
      document,
      extractedData,
      language,
      sessionId: req.sessionId,
    })

    return res.status(200).json({
      documentId,
      language: checklist.language,
      documentType: checklist.documentType,
      items: checklist.items,
      generatedAt: checklist.generatedAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/checklists/:documentId
 * Retrieves existing checklist for the document.
 */
export async function getChecklist(req, res, next) {
  try {
    const { documentId } = req.params
    const document = await dataRepository.findDocumentById(documentId)

    if (!document) {
      return res.status(404).json({
        error: 'Document not found.',
        code: 'DOCUMENT_NOT_FOUND',
      })
    }

    // Session Ownership Enforcement
    if (document.sessionId !== req.sessionId) {
      return res.status(403).json({
        error: 'Access denied.',
        code: 'UNAUTHORIZED_ACCESS',
      })
    }

    if (document.status === 'rejected') {
      return res.status(422).json({
        error: 'Cannot fetch checklist for a rejected document.',
        code: 'DOCUMENT_REJECTED',
      })
    }

    const language = req.query.language || 'en'
    const checklist = await dataRepository.findChecklistByDocument(documentId, language)

    if (!checklist) {
      return res.status(404).json({
        error: 'No checklist found for this document. Please generate one first.',
        code: 'CHECKLIST_NOT_FOUND',
      })
    }

    return res.status(200).json({
      documentId,
      language: checklist.language,
      documentType: checklist.documentType,
      items: checklist.items || [],
      generatedAt: checklist.generatedAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/v1/checklists/:documentId/items/:itemId
 * Toggles completion status of a checklist item.
 */
export async function toggleChecklistItem(req, res, next) {
  try {
    const { documentId, itemId } = req.params
    const document = await dataRepository.findDocumentById(documentId)

    if (!document) {
      return res.status(404).json({
        error: 'Document not found.',
        code: 'DOCUMENT_NOT_FOUND',
      })
    }

    // Session Ownership Enforcement
    if (document.sessionId !== req.sessionId) {
      return res.status(403).json({
        error: 'Access denied.',
        code: 'UNAUTHORIZED_ACCESS',
      })
    }

    if (document.status === 'rejected') {
      return res.status(422).json({
        error: 'Cannot update checklist for a rejected document.',
        code: 'DOCUMENT_REJECTED',
      })
    }

    const parseResult = ChecklistToggleSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid toggle parameters.',
        details: parseResult.error.issues,
        code: 'INVALID_TOGGLE_PARAMETERS',
      })
    }

    const { isCompleted } = parseResult.data

    const updatedChecklist = await dataRepository.updateChecklistItem(
      documentId,
      itemId,
      isCompleted
    )

    if (!updatedChecklist) {
      return res.status(404).json({
        error: `Checklist item with ID '${itemId}' not found.`,
        code: 'ITEM_NOT_FOUND',
      })
    }

    const updatedItem = (updatedChecklist.items || []).find((i) => i.id === itemId)

    return res.status(200).json({
      message: 'Checklist item updated successfully.',
      documentId,
      itemId,
      isCompleted: updatedItem ? updatedItem.isCompleted : isCompleted,
    })
  } catch (err) {
    next(err)
  }
}
