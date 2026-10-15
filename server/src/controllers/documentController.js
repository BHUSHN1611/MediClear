import { config } from '../config/env.js'
import { storageService } from '../services/storageService.js'
import { dataRepository } from '../services/dataRepository.js'
import { extractDocumentData } from '../services/extractionService.js'
import { UserCorrectionSchema } from '../validators/aiOutputSchemas.js'

/**
 * POST /api/v1/documents/upload
 * Validates consent, stores file privately, creates document record.
 */
export async function uploadDocument(req, res, next) {
  try {
    // 1. Consent Verification
    const consent = await dataRepository.findConsentBySession(req.sessionId)
    if (!consent) {
      return res.status(403).json({
        error: 'Explicit patient consent must be recorded before uploading medical documents.',
        code: 'CONSENT_REQUIRED',
      })
    }

    const file = req.file
    const originalName = file.originalname
    const mimeType = file.validatedMimeType || file.mimetype
    const buffer = file.buffer

    // 2. Save file via Storage Service Abstraction
    const saved = await storageService.saveFile({
      buffer,
      originalName,
      mimeType,
    })

    // 3. 30-Day TTL expiration
    const expiresAt = new Date(
      Date.now() + config.DOCUMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000
    )

    // 4. Create Document Metadata Record
    const document = await dataRepository.createDocument({
      consentId: consent._id || consent.id,
      sessionId: req.sessionId,
      originalName,
      storedName: saved.storedName,
      mimeType,
      sizeBytes: saved.sizeBytes,
      pageCount: 1,
      status: 'uploaded',
      expiresAt,
    })

    return res.status(201).json({
      documentId: document._id || document.id,
      status: document.status,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      expiresAt: document.expiresAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/documents/:documentId
 * Returns document metadata with strict session ownership verification.
 */
export async function getDocument(req, res, next) {
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
        error: 'Access denied. You do not have permission to view this document.',
        code: 'UNAUTHORIZED_ACCESS',
      })
    }

    return res.status(200).json({
      documentId: document._id || document.id,
      status: document.status,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      pageCount: document.pageCount,
      expiresAt: document.expiresAt,
      createdAt: document.createdAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/documents/:documentId/status
 * Polling endpoint for document lifecycle status.
 */
export async function getDocumentStatus(req, res, next) {
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

    return res.status(200).json({
      documentId: document._id || document.id,
      status: document.status,
      rejectionCode: document.rejectionCode || null,
      rejectionReason: document.rejectionReason || null,
      errorMessage: document.errorMessage || null,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/documents/:documentId/extract
 * Triggers extraction of document text and structured fields.
 */
export async function triggerExtraction(req, res, next) {
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

    // Guard: Do not re-process already rejected documents
    if (document.status === 'rejected') {
      return res.status(422).json({
        code: document.rejectionCode || 'UNSUPPORTED_DOCUMENT_TYPE',
        message: 'This document was previously rejected.',
        reason: document.rejectionReason || 'Document is not a supported type.',
        documentId,
      })
    }

    // Update status to 'extracting'
    await dataRepository.updateDocumentStatus(documentId, 'extracting')

    // Retrieve file buffer from private storage
    const buffer = await storageService.getFile(document.storedName)

    // Execute extraction via extractionService
    const extracted = await extractDocumentData({ document, buffer })

    // STRICT REJECTION GATE:
    // If document is unsupported, unreadable, or isSupportedDocument is false
    if (
      extracted.documentType === 'unsupported' ||
      extracted.isSupportedDocument === false ||
      extracted.isUnreadable === true
    ) {
      const rejectionCode = extracted.isUnreadable
        ? 'UNREADABLE_DOCUMENT'
        : 'UNSUPPORTED_DOCUMENT_TYPE'
      const rejectionReason =
        extracted.rejectionReason ||
        (extracted.isUnreadable
          ? 'Document is unreadable, blurry, or corrupted. Please upload a clear photo or PDF.'
          : 'This document does not appear to be a recognized lab report, prescription, or discharge instruction.')

      // 1. Mark document status as 'rejected'
      await dataRepository.updateDocumentStatus(documentId, 'rejected', {
        rejectionCode,
        rejectionReason,
      })

      // 2. Immediately delete physical stored file (privacy requirement)
      if (document.storedName) {
        try {
          await storageService.deleteFile(document.storedName)
        } catch (delErr) {
          console.warn(`[Storage Warning] Failed to delete file ${document.storedName}:`, delErr.message)
        }
      }

      // 3. Return HTTP 422 immediately (do not save extracted data, do not call downstream services)
      return res.status(422).json({
        code: rejectionCode,
        message:
          rejectionCode === 'UNREADABLE_DOCUMENT'
            ? 'The uploaded document is blurry, corrupted, or unreadable. Please upload a clear photo or PDF.'
            : "This doesn't look like a lab report, prescription, or discharge instruction. MediClear can only explain these document types.",
        reason: rejectionReason,
        documentId,
      })
    }

    // Save extracted clinical data ONLY for successfully classified documents
    await dataRepository.createOrUpdateExtractedData({
      documentId,
      sessionId: req.sessionId,
      documentType: extracted.documentType,
      rawText: extracted.rawText || '',
      fields: extracted.fields || [],
      uncertainties: extracted.uncertainties || [],
      isUnreadable: false,
    })

    await dataRepository.updateDocumentStatus(documentId, 'extracted')

    return res.status(200).json({
      documentId,
      status: 'extracted',
      documentType: extracted.documentType,
      fieldsCount: extracted.fields.length,
      uncertainties: extracted.uncertainties,
      isUnreadable: false,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/documents/:documentId/extracted-data
 * Returns extracted structured fields and uncertainty notes.
 */
export async function getExtractedData(req, res, next) {
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

    // Guard: Rejected documents refuse access
    if (document.status === 'rejected') {
      return res.status(422).json({
        error: 'This document was rejected as unsupported or unreadable.',
        code: document.rejectionCode || 'UNSUPPORTED_DOCUMENT_TYPE',
        reason: document.rejectionReason,
      })
    }

    const extracted = await dataRepository.findExtractedDataByDocument(documentId)

    if (!extracted) {
      return res.status(404).json({
        error: 'No extracted data found for this document.',
        code: 'NOT_EXTRACTED_YET',
      })
    }

    return res.status(200).json({
      documentId,
      documentType: extracted.documentType,
      fields: extracted.fields || [],
      uncertainties: extracted.uncertainties || [],
      isUnreadable: extracted.isUnreadable || false,
      extractedAt: extracted.extractedAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/v1/documents/:documentId/extracted-data
 * Handles user manual corrections to extracted clinical fields.
 */
export async function updateExtractedData(req, res, next) {
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

    // Guard: Rejected documents refuse updates
    if (document.status === 'rejected') {
      return res.status(422).json({
        error: 'Cannot update extracted data for a rejected document.',
        code: 'DOCUMENT_REJECTED',
      })
    }

    // Validate request body
    const parseResult = UserCorrectionSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid correction parameters.',
        details: parseResult.error.issues,
        code: 'INVALID_CORRECTION_DATA',
      })
    }

    const updated = await dataRepository.updateExtractedFields(
      documentId,
      parseResult.data.fields
    )

    if (!updated) {
      return res.status(404).json({
        error: 'Extracted data record not found for update.',
        code: 'RECORD_NOT_FOUND',
      })
    }

    return res.status(200).json({
      message: 'Extracted fields updated successfully.',
      documentId,
      fields: updated.fields,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/v1/documents/:documentId
 * Cascade delete: removes physical stored file and database record.
 */
export async function deleteDocument(req, res, next) {
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

    // 1. Delete physical file via Storage Service
    if (document.storedName) {
      await storageService.deleteFile(document.storedName)
    }

    // 2. Cascade delete database record
    await dataRepository.deleteDocument(documentId)

    return res.status(200).json({
      message: 'Document and all associated clinical data deleted successfully.',
      documentId,
    })
  } catch (err) {
    next(err)
  }
}
