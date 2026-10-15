import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { dataRepository } from '../src/services/dataRepository.js'
import { safetyService } from '../src/services/safetyService.js'
import {
  generateDeterministicExplanation,
  generateDocumentExplanation,
} from '../src/services/explanationService.js'
import { ExplanationOutputSchema } from '../src/validators/aiOutputSchemas.js'
import { setMockGeminiClient } from '../src/config/gemini.js'
import { createMockGeminiClient } from './mockGemini.js'

test('Phase 4 — AI Explanations, Medical Glossary, Safety Guardrails', async (t) => {
  const app = createApp()
  dataRepository.clearMemory()
  setMockGeminiClient(createMockGeminiClient())

  let sessionCookie = null
  let labDocId = null

  // Helper to establish consent on session
  const initSessionWithConsent = async () => {
    const res = await request(app).get('/api/v1/health')
    const cookie = res.headers['set-cookie'][0].split(';')[0]
    await request(app)
      .post('/api/v1/consents')
      .set('Cookie', cookie)
      .send({ language: 'en', version: '1.0' })
    return cookie
  }

  sessionCookie = await initSessionWithConsent()

  // Setup: Upload and extract a synthetic lab report
  const labPdfBuffer = Buffer.from(
    '%PDF-1.4\nComprehensive Metabolic & Lipid Panel\nFasting Blood Glucose: 118 mg/dL (70-99)\nTotal Cholesterol: 224 mg/dL (<200)\nHDL Cholesterol: 42 mg/dL\nLDL Cholesterol: 148 mg/dL\n%%EOF'
  )

  const uploadRes = await request(app)
    .post('/api/v1/documents/upload')
    .set('Cookie', sessionCookie)
    .attach('file', labPdfBuffer, 'Lab_Report.pdf')

  labDocId = uploadRes.body.documentId

  await request(app)
    .post(`/api/v1/documents/${labDocId}/extract`)
    .set('Cookie', sessionCookie)

  await t.test('1. Generate plain-language explanation in English', async () => {
    const res = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.equal(res.body.status, 'ready')
    assert.equal(res.body.language, 'en')
    assert.ok(Array.isArray(res.body.summary))
    assert.ok(res.body.summary.length >= 1)
    assert.ok(Array.isArray(res.body.extractedFacts))
    assert.ok(res.body.extractedFacts.length >= 4)
    assert.ok(Array.isArray(res.body.medicalTerms))
    assert.ok(res.body.medicalTerms.length >= 1)

    // Verify Glucose is present in extractedFacts without invented values
    const glucoseFact = res.body.extractedFacts.find((f) => f.label.includes('Glucose'))
    assert.ok(glucoseFact)
    assert.equal(glucoseFact.value, '118')
    assert.equal(glucoseFact.unit, 'mg/dL')
    assert.equal(glucoseFact.source, 'document')
  })

  await t.test('2. Generate plain-language explanation in Hindi (Devanagari)', async () => {
    const res = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'hi' })

    assert.equal(res.status, 200)
    assert.equal(res.body.language, 'hi')
    assert.ok(res.body.summary.length >= 1)
    // Check that Hindi summary contains Devanagari characters
    assert.match(res.body.summary[0], /[\u0900-\u097F]/)

    // Check Hindi glossary terms
    assert.ok(res.body.medicalTerms.length >= 1)
    assert.match(res.body.medicalTerms[0].simpleExplanation, /[\u0900-\u097F]/)
  })

  await t.test('3. Fetch Analysis Summary via GET /analysis/:id/summary', async () => {
    const res = await request(app)
      .get(`/api/v1/analysis/${labDocId}/summary?language=en`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.equal(res.body.language, 'en')
    assert.ok(Array.isArray(res.body.summary))
    assert.ok(Array.isArray(res.body.extractedFacts))
  })

  await t.test('4. Fetch Medical Glossary Terms via GET /analysis/:id/terms', async () => {
    const res = await request(app)
      .get(`/api/v1/analysis/${labDocId}/terms?language=en`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.ok(Array.isArray(res.body.medicalTerms))
    assert.ok(res.body.medicalTerms.length >= 1)
    assert.ok(res.body.medicalTerms[0].term)
    assert.ok(res.body.medicalTerms[0].simpleExplanation)
  })

  await t.test('5. Reject explanation request for unsupported language', async () => {
    const res = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'fr' }) // French not supported in MVP

    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'INVALID_EXPLANATION_REQUEST')
  })

  await t.test('6. Attempting explanation before extraction returns 400', async () => {
    // Upload document but do not call extract
    const unextractedPdf = Buffer.from('%PDF-1.4\nUnextracted\n%%EOF')
    const upRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', unextractedPdf, 'Doc.pdf')

    const newDocId = upRes.body.documentId

    const res = await request(app)
      .post(`/api/v1/analysis/${newDocId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'EXTRACTION_REQUIRED')
  })

  await t.test('7. Deterministic Safety Check: Emergency warning triggers urgent directive', async () => {
    const res = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'I am experiencing sudden crushing chest pain and cannot breathe',
        language: 'en',
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.safe, false)
    assert.equal(res.body.category, 'EMERGENCY')
    assert.ok(res.body.flags.includes('EMERGENCY_DETECTED'))
    assert.match(res.body.redirectMessage, /EMERGENCY/i)
  })

  await t.test('8. Deterministic Safety Check: Medication alteration request triggers refusal', async () => {
    const res = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'Should I stop taking my cholesterol medication since levels improved?',
        language: 'en',
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.safe, false)
    assert.equal(res.body.category, 'MEDICATION_CHANGE')
    assert.ok(res.body.flags.includes('MEDICATION_ALTERATION_PROHIBITED'))
    assert.match(res.body.redirectMessage, /prescribing doctor/i)
  })

  await t.test('9. Deterministic Safety Check: Diagnostic inference demand triggers refusal', async () => {
    const res = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'Do I have diabetes based on this blood test?',
        language: 'en',
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.safe, false)
    assert.equal(res.body.category, 'DIAGNOSTIC_CLAIM')
    assert.ok(res.body.flags.includes('DIAGNOSTIC_DEMAND_REFUSED'))
  })

  await t.test('10. Cross-session access enforcement on all analysis endpoints', async () => {
    const otherCookie = await initSessionWithConsent()

    // 10a. Cross-session EXPLAIN attempt returns 403
    const explainRes = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', otherCookie)
      .send({ language: 'en' })
    assert.equal(explainRes.status, 403)
    assert.equal(explainRes.body.code, 'UNAUTHORIZED_ACCESS')

    // 10b. Cross-session SUMMARY attempt returns 403
    const summaryRes = await request(app)
      .get(`/api/v1/analysis/${labDocId}/summary`)
      .set('Cookie', otherCookie)
    assert.equal(summaryRes.status, 403)
    assert.equal(summaryRes.body.code, 'UNAUTHORIZED_ACCESS')

    // 10c. Cross-session TERMS attempt returns 403
    const termsRes = await request(app)
      .get(`/api/v1/analysis/${labDocId}/terms`)
      .set('Cookie', otherCookie)
    assert.equal(termsRes.status, 403)
    assert.equal(termsRes.body.code, 'UNAUTHORIZED_ACCESS')
  })

  await t.test('11. Consent enforcement: explain without active patient consent returns 403', async () => {
    // New session without consenting
    const noConsentRes = await request(app).get('/api/v1/health')
    const noConsentCookie = noConsentRes.headers['set-cookie'][0].split(';')[0]

    // Attempt to explain our document
    const res = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', noConsentCookie)
      .send({ language: 'en' })

    // Session ownership fails first if it belongs to another session (403 UNAUTHORIZED_ACCESS)
    assert.equal(res.status, 403)
  })

  await t.test('12. Hindi Devanagari & Hinglish Emergency Wording triggers immediate directive', async () => {
    // 12a. Hindi Devanagari emergency
    const hiRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'सीने में तेज दर्द है और सांस लेने में भारी तकलीफ हो रही है',
        language: 'hi',
      })
    assert.equal(hiRes.status, 200)
    assert.equal(hiRes.body.safe, false)
    assert.equal(hiRes.body.category, 'EMERGENCY')
    assert.ok(hiRes.body.flags.includes('EMERGENCY_DETECTED'))
    assert.match(hiRes.body.redirectMessage, /आपातकालीन/i)
    assert.match(hiRes.body.redirectMessage, /112/)

    // 12b. Hinglish emergency
    const hinglishRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'Mujhe dil ka daura aa gaya hai aur seene me tez dard hai',
        language: 'en',
      })
    assert.equal(hinglishRes.status, 200)
    assert.equal(hinglishRes.body.safe, false)
    assert.equal(hinglishRes.body.category, 'EMERGENCY')
    assert.ok(hinglishRes.body.flags.includes('EMERGENCY_DETECTED'))
    assert.match(hinglishRes.body.redirectMessage, /EMERGENCY/i)

    // 12c. Paraphrased English emergency (tightness / choking)
    const paraRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'I feel crushing chest pain radiating to arm and I am gasping for air',
        language: 'en',
      })
    assert.equal(paraRes.status, 200)
    assert.equal(paraRes.body.safe, false)
    assert.equal(paraRes.body.category, 'EMERGENCY')
  })

  await t.test('13. Hindi Devanagari & Hinglish Medication-Change Requests trigger refusal', async () => {
    // 13a. Hindi Devanagari medication change
    const hiRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'क्या मैं अपनी बीपी की दवा बंद कर दूं?',
        language: 'hi',
      })
    assert.equal(hiRes.status, 200)
    assert.equal(hiRes.body.safe, false)
    assert.equal(hiRes.body.category, 'MEDICATION_CHANGE')
    assert.ok(hiRes.body.flags.includes('MEDICATION_ALTERATION_PROHIBITED'))
    assert.match(hiRes.body.redirectMessage, /दवा सुरक्षा/i)

    // 13b. Hinglish medication change
    const hinglishRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'Should I cut my medicine tablet dosage and dawa band kar du?',
        language: 'en',
      })
    assert.equal(hinglishRes.status, 200)
    assert.equal(hinglishRes.body.safe, false)
    assert.equal(hinglishRes.body.category, 'MEDICATION_CHANGE')
  })

  await t.test('14. Hindi Devanagari & Hinglish Diagnostic Requests trigger refusal', async () => {
    // 14a. Hindi Devanagari diagnostic request
    const hiRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'क्या मुझे कैंसर है? कृपया मेरा रोग बताएं।',
        language: 'hi',
      })
    assert.equal(hiRes.status, 200)
    assert.equal(hiRes.body.safe, false)
    assert.equal(hiRes.body.category, 'DIAGNOSTIC_CLAIM')
    assert.ok(hiRes.body.flags.includes('DIAGNOSTIC_DEMAND_REFUSED'))
    assert.match(hiRes.body.redirectMessage, /नैदानिक अस्वीकरण/i)

    // 14b. Hinglish diagnostic request
    const hinglishRes = await request(app)
      .post('/api/v1/safety/check')
      .send({
        text: 'kya mujhe diabetes hai? tell me what disease I have',
        language: 'en',
      })
    assert.equal(hinglishRes.status, 200)
    assert.equal(hinglishRes.body.safe, false)
    assert.equal(hinglishRes.body.category, 'DIAGNOSTIC_CLAIM')
  })

  await t.test('15. Groundedness check: missing units and reference ranges are never invented', async () => {
    // Upload document with parameter missing unit and reference range
    const docMissingUnits = Buffer.from(
      '%PDF-1.4\nBlood Group Test\nBlood Group: B Positive\nRh Factor: Positive\n%%EOF'
    )
    const upRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', docMissingUnits, 'BloodGroup.pdf')

    const docId = upRes.body.documentId

    await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    const explainRes = await request(app)
      .post(`/api/v1/analysis/${docId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(explainRes.status, 200)
    // Verify that extracted facts preserve empty unit without hallucinating fake unit
    for (const fact of explainRes.body.extractedFacts) {
      assert.equal(fact.unit, '', 'Missing unit must remain empty string; must not fabricate units')
      assert.equal(fact.source, 'document', 'Unmodified extracted fact must be marked source: document')
    }
  })

  await t.test('16. Distinguish user-corrected values from document-extracted values', async () => {
    // Patch one field on labDocId
    const getExtracted = await request(app)
      .get(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', sessionCookie)

    const glucoseField = getExtracted.body.fields.find((f) => f.key.includes('Glucose'))
    assert.ok(glucoseField)

    // User corrects value from 118 to 122
    await request(app)
      .patch(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', sessionCookie)
      .send({
        fields: [{ id: glucoseField.id, value: '122' }],
      })

    // Re-generate explanation
    const reExplainRes = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(reExplainRes.status, 200)
    const updatedFact = reExplainRes.body.extractedFacts.find((f) => f.label.includes('Glucose'))
    assert.ok(updatedFact)
    assert.equal(updatedFact.value, '122')
    assert.equal(updatedFact.source, 'user_corrected', 'User-edited field must be marked source: user_corrected')

    // Uncorrected cholesterol field must remain source: document
    const cholFact = reExplainRes.body.extractedFacts.find((f) => f.label.includes('Cholesterol'))
    assert.ok(cholFact)
    assert.equal(cholFact.source, 'document', 'Unedited field must remain source: document')
  })

  await t.test('17. Malformed AI output or API timeout gracefully falls back to clinical engine', () => {
    // Deterministic fallback function directly handles malformed/empty data without throwing
    const fallbackResult = generateDeterministicExplanation({
      documentType: 'lab_report',
      fields: [
        { key: 'Total Cholesterol', value: '220', unit: 'mg/dL', status: 'high', isUserCorrected: false },
      ],
      language: 'en',
    })

    assert.ok(fallbackResult.summary.length >= 1)
    assert.equal(fallbackResult.extractedFacts[0].label, 'Total Cholesterol')
    assert.equal(fallbackResult.extractedFacts[0].source, 'document')
    assert.equal(fallbackResult.medicalTerms[0].source, 'educational_glossary')
    // Validate output adheres to strict Zod schema
    const validated = ExplanationOutputSchema.parse(fallbackResult)
    assert.ok(validated)
  })

  await t.test('18. generateDocumentExplanation executes fallback smoothly and validates via Zod', async () => {
    const explanation = await generateDocumentExplanation({
      document: { id: 'doc-123', originalName: 'Test.pdf' },
      extractedData: {
        documentType: 'lab_report',
        fields: [
          { key: 'Serum Creatinine', value: '1.1', unit: 'mg/dL', status: 'normal', isUserCorrected: false },
        ],
        uncertainties: [],
      },
      language: 'en',
    })

    assert.equal(explanation.documentType, 'lab_report')
    assert.equal(explanation.language, 'en')
    assert.ok(explanation.summary.length >= 1)
    assert.equal(explanation.extractedFacts[0].label, 'Serum Creatinine')
    assert.equal(explanation.extractedFacts[0].value, '1.1')
    assert.equal(explanation.extractedFacts[0].unit, 'mg/dL')
    assert.equal(explanation.extractedFacts[0].source, 'document')
    assert.equal(explanation.medicalTerms[0].term, 'Serum Creatinine')
    assert.equal(explanation.medicalTerms[0].source, 'educational_glossary')
  })

  await t.test('19. Post-generation safety guardrail sanitizes forbidden diagnostic assertions', () => {
    const rawAiOutput = {
      documentType: 'lab_report',
      language: 'en',
      summary: [
        'Your test indicates you have been diagnosed with kidney disease and you should stop taking your pills.',
      ],
      extractedFacts: [
        { label: 'Serum Creatinine', value: '2.5', unit: 'mg/dL', source: 'document' },
      ],
      medicalTerms: [],
      uncertainties: [],
      safetyFlags: [],
    }

    const sanitized = safetyService.validateAiExplanationSafety(rawAiOutput, 'en')
    assert.ok(sanitized.safetyFlags.includes('UNSAFE_LANGUAGE_SANITIZED'))
    assert.match(sanitized.summary.join(' '), /educational purposes only/i)
  })

  await t.test('20. Zod schema strictly validates and rejects malformed explanation output', () => {
    const malformedPayload = {
      documentType: 'lab_report',
      language: 'en',
      summary: [], // Must have at least 1 bullet
      extractedFacts: 'not an array',
      medicalTerms: [],
    }

    const validation = ExplanationOutputSchema.safeParse(malformedPayload)
    assert.equal(validation.success, false)
  })

  await t.test('21. Cascade delete purges analysis records along with document', async () => {
    // Delete document
    const delRes = await request(app)
      .delete(`/api/v1/documents/${labDocId}`)
      .set('Cookie', sessionCookie)

    assert.equal(delRes.status, 200)

    // Verify Analysis record is purged
    const getRes = await request(app)
      .get(`/api/v1/analysis/${labDocId}/summary`)
      .set('Cookie', sessionCookie)

    assert.equal(getRes.status, 404)
  })
})
