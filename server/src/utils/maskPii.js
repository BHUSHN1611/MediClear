/**
 * Utility to mask common personal identifiers (PII) from document text
 * before sending to external AI models.
 * 
 * NOTE: PII masking is best-effort and cannot guarantee 100% removal
 * of all indirect identifiers from complex medical layouts.
 */

export function maskPii(text) {
  if (!text || typeof text !== 'string') {
    return { maskedText: '', wasRedacted: false, counts: {} }
  }

  let maskedText = text
  const counts = {}

  // 1. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const emailMatches = maskedText.match(emailRegex)
  if (emailMatches) {
    counts.emails = emailMatches.length
    maskedText = maskedText.replace(emailRegex, '[REDACTED_EMAIL]')
  }

  // 2. Phone numbers (10-digit Indian numbers, +91, with or without spaces/dashes)
  const phoneRegex = /(?:\+?91[\s-]?)?[6789]\d{9}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g
  const phoneMatches = maskedText.match(phoneRegex)
  if (phoneMatches) {
    counts.phones = phoneMatches.length
    maskedText = maskedText.replace(phoneRegex, '[REDACTED_PHONE]')
  }

  // 3. Indian Aadhaar numbers (12 digits, often in 4-digit groups)
  const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/g
  const aadhaarMatches = maskedText.match(aadhaarRegex)
  if (aadhaarMatches) {
    counts.aadhaar = aadhaarMatches.length
    maskedText = maskedText.replace(aadhaarRegex, '[REDACTED_AADHAAR]')
  }

  // 4. Indian PAN numbers (5 uppercase letters, 4 digits, 1 letter)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g
  const panMatches = maskedText.match(panRegex)
  if (panMatches) {
    counts.pan = panMatches.length
    maskedText = maskedText.replace(panRegex, '[REDACTED_PAN]')
  }

  // 5. Patient ID / UHID / MRN labels
  const patientIdRegex = /(?:UHID|MRN|Patient\s*ID|Reg(?:istration)?\.?\s*No\.?)[:\s]+([A-Za-z0-9\/-]+)/gi
  maskedText = maskedText.replace(patientIdRegex, (match, id) => {
    counts.patientIds = (counts.patientIds || 0) + 1
    return match.replace(id, '[REDACTED_ID]')
  })

  // 6. Explicit Patient Name labels
  const nameLabelRegex = /(?:Patient\s*Name|Name\s*of\s*Patient|Name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
  maskedText = maskedText.replace(nameLabelRegex, (match, name) => {
    counts.names = (counts.names || 0) + 1
    return match.replace(name, '[REDACTED_NAME]')
  })

  const wasRedacted = Object.keys(counts).length > 0

  return {
    maskedText,
    wasRedacted,
    counts,
  }
}
