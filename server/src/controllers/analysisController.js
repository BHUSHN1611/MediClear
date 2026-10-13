import { dataRepository } from '../services/dataRepository.js'
import { generateDocumentExplanation } from '../services/explanationService.js'
import { safetyService } from '../services/safetyService.js'
import {
  ExplanationRequestSchema,
  SafetyCheckRequestSchema,
} from '../validators/aiOutputSchemas.js'

/**
 * POST /api/v1/analysis/:documentId/explain
 * Generates plain-language medical explanation grounded in extracted data.
 */
export async function generateExplanation(req, res, next) {
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
        error: 'Access denied. You do not have permission to analyze this document.',
        code: 'UNAUTHORIZED_ACCESS',
      })
    }

    // Consent Verification
    const consent = await dataRepository.findConsentBySession(req.sessionId)
    if (!consent) {
      return res.status(403).json({
        error: 'Active patient consent is required to generate explanations.',
        code: 'CONSENT_REQUIRED',
      })
    }

    // Parse request body
    const parseResult = ExplanationRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid explanation parameters.',
        details: parseResult.error.issues,
        code: 'INVALID_EXPLANATION_REQUEST',
      })
    }

    const { language } = parseResult.data

    // Check extracted data availability
    const extractedData = await dataRepository.findExtractedDataByDocument(documentId)
    if (!extractedData) {
      return res.status(400).json({
        error: 'Document has not been extracted yet. Please extract data before requesting an explanation.',
        code: 'EXTRACTION_REQUIRED',
      })
    }

    // Set document status to 'explaining'
    await dataRepository.updateDocumentStatus(documentId, 'explaining')

    // Generate explanation
    const explanation = await generateDocumentExplanation({
      document,
      extractedData,
      language,
    })

    // Save Analysis record
    const analysis = await dataRepository.createOrUpdateAnalysis({
      documentId,
      sessionId: req.sessionId,
      language: explanation.language,
      documentType: explanation.documentType,
      summary: explanation.summary,
      extractedFacts: explanation.extractedFacts,
      medicalTerms: explanation.medicalTerms,
      uncertainties: explanation.uncertainties,
      safetyFlags: explanation.safetyFlags,
    })

    // Mark document status as 'ready'
    await dataRepository.updateDocumentStatus(documentId, 'ready')

    return res.status(200).json({
      documentId,
      status: 'ready',
      language: analysis.language,
      documentType: analysis.documentType,
      summary: analysis.summary,
      extractedFacts: analysis.extractedFacts,
      medicalTerms: analysis.medicalTerms,
      uncertainties: analysis.uncertainties,
      safetyFlags: analysis.safetyFlags,
      generatedAt: analysis.generatedAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/analysis/:documentId/summary
 * Returns educational summary bullets, extracted facts, and safety notices.
 */
export async function getAnalysisSummary(req, res, next) {
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
    const analysis = await dataRepository.findAnalysisByDocument(documentId, language)

    if (!analysis) {
      return res.status(404).json({
        error: 'No analysis summary found for this document. Please generate an explanation first.',
        code: 'ANALYSIS_NOT_FOUND',
      })
    }

    return res.status(200).json({
      documentId,
      language: analysis.language,
      documentType: analysis.documentType,
      summary: analysis.summary || [],
      extractedFacts: analysis.extractedFacts || [],
      safetyFlags: analysis.safetyFlags || [],
      uncertainties: analysis.uncertainties || [],
      generatedAt: analysis.generatedAt,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/analysis/:documentId/terms
 * Returns plain-language medical glossary terms related to the document.
 */
export async function getAnalysisTerms(req, res, next) {
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
    const analysis = await dataRepository.findAnalysisByDocument(documentId, language)

    if (!analysis) {
      return res.status(404).json({
        error: 'No medical terms found for this document.',
        code: 'ANALYSIS_NOT_FOUND',
      })
    }

    return res.status(200).json({
      documentId,
      language: analysis.language,
      medicalTerms: analysis.medicalTerms || [],
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/safety/check
 * Deterministic clinical safety evaluation endpoint.
 */
export async function checkSafety(req, res, next) {
  try {
    const parseResult = SafetyCheckRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid safety check parameters.',
        details: parseResult.error.issues,
        code: 'INVALID_SAFETY_REQUEST',
      })
    }

    const { text, language } = parseResult.data
    const safetyResult = safetyService.checkClinicalSafety(text, { language })

    return res.status(200).json({
      safe: safetyResult.safe,
      category: safetyResult.category || null,
      flags: safetyResult.flags,
      redirectMessage: safetyResult.redirectMessage || null,
    })
  } catch (err) {
    next(err)
  }
}
