import { dataRepository } from '../services/dataRepository.js'
import { generateDocumentDoctorQuestions } from '../services/questionService.js'
import { GenerationRequestSchema } from '../validators/aiOutputSchemas.js'

/**
 * POST /api/v1/questions/:documentId/generate
 * Generates empowering consultation questions grounded in extracted findings.
 */
export async function generateQuestions(req, res, next) {
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
        error: 'Active patient consent is required before generating consultation questions.',
        code: 'CONSENT_REQUIRED',
      })
    }

    const parseResult = GenerationRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid generation request parameters.',
        details: parseResult.error.issues,
        code: 'INVALID_REQUEST_PARAMETERS',
      })
    }

    const { language } = parseResult.data

    const extractedData = await dataRepository.findExtractedDataByDocument(documentId)
    if (!extractedData) {
      return res.status(400).json({
        error: 'Document has not been extracted yet. Extraction is required before generating questions.',
        code: 'EXTRACTION_REQUIRED',
      })
    }

    const questionsRecord = await generateDocumentDoctorQuestions({
      document,
      extractedData,
      language,
      sessionId: req.sessionId,
    })

    return res.status(200).json({
      documentId,
      language: questionsRecord.language,
      documentType: questionsRecord.documentType,
      questions: questionsRecord.questions,
      generatedAt: questionsRecord.generatedAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/questions/:documentId
 * Retrieves existing consultation questions for the document.
 */
export async function getQuestions(req, res, next) {
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

    const language = req.query.language || 'en'
    const record = await dataRepository.findDoctorQuestionsByDocument(documentId, language)

    if (!record) {
      return res.status(404).json({
        error: 'No doctor consultation questions found for this document. Please generate them first.',
        code: 'QUESTIONS_NOT_FOUND',
      })
    }

    return res.status(200).json({
      documentId,
      language: record.language,
      documentType: record.documentType,
      questions: record.questions || [],
      generatedAt: record.generatedAt,
    })
  } catch (err) {
    next(err)
  }
}
