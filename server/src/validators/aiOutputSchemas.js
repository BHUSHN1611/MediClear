import { z } from 'zod'

/**
 * Extracted Field Schema
 * Represents a discrete clinical item extracted verbatim from the document.
 */
export const ExtractedFieldSchema = z.object({
  id: z.string(),
  key: z.string().min(1, 'Field name/key cannot be empty'),
  value: z.string().min(1, 'Field value cannot be empty'),
  unit: z.string().optional().default(''),
  referenceRange: z.string().optional().default(''),
  status: z.enum(['normal', 'high', 'low', 'unspecified']).default('unspecified'),
  confidence: z.enum(['high', 'medium', 'low']),
  isUserCorrected: z.boolean().default(false),
  originalValue: z.string().optional(),
})

/**
 * Extraction Output Schema
 * Validates the structured payload returned by the extraction engine.
 */
export const ExtractionOutputSchema = z.object({
  documentType: z.enum(['lab_report', 'prescription', 'discharge_instructions', 'unknown']),
  fields: z.array(ExtractedFieldSchema),
  uncertainties: z.array(z.string()).default([]),
  rawText: z.string().default(''),
  isUnreadable: z.boolean().default(false),
})

/**
 * Schema for user manual corrections (PATCH /documents/:id/extracted-data)
 */
export const UserCorrectionSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string(),
      value: z.string(),
      unit: z.string().optional(),
    })
  ).min(1, 'At least one field update must be provided'),
})

/**
 * Extracted Fact Schema
 * Distinctly separates factual data directly from the patient's report from general definitions.
 */
export const ExtractedFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.string().optional().default(''),
  source: z.enum(['document', 'user_corrected']).default('document'),
})

/**
 * Medical Glossary Term Schema
 * Educational definitions of clinical terminology without diagnosing the patient.
 */
export const MedicalTermSchema = z.object({
  term: z.string(),
  simpleExplanation: z.string(),
  source: z.string().default('educational_glossary'),
})

/**
 * Complete Explanation Output Schema
 * Validates plain-language educational summaries and terms.
 */
export const ExplanationOutputSchema = z.object({
  documentType: z.enum(['lab_report', 'prescription', 'discharge_instructions', 'unknown']),
  language: z.enum(['en', 'hi']),
  summary: z.array(z.string()).min(1, 'At least one summary bullet/paragraph is required'),
  extractedFacts: z.array(ExtractedFactSchema),
  medicalTerms: z.array(MedicalTermSchema),
  uncertainties: z.array(z.string()).default([]),
  safetyFlags: z.array(z.string()).default([]),
})

/**
 * Schema for Explanation Request (POST /analysis/:documentId/explain)
 */
export const ExplanationRequestSchema = z.object({
  language: z.enum(['en', 'hi']).default('en'),
})

/**
 * Schema for Safety Check Request (POST /safety/check)
 */
export const SafetyCheckRequestSchema = z.object({
  text: z.string().min(1, 'Text to evaluate cannot be empty'),
  language: z.enum(['en', 'hi']).default('en'),
  documentId: z.string().optional(),
})
