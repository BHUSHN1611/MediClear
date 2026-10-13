import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { dataRepository } from '../src/services/dataRepository.js'
import { safetyService } from '../src/services/safetyService.js'
import {
  generateDeterministicExplanation,
} from '../src/services/explanationService.js'
import { ExplanationOutputSchema } from '../src/validators/aiOutputSchemas.js'

test('Phase 4 — AI Explanations, Medical Glossary, Safety Guardrails', async (t) => {
  const app = createApp()
  dataRepository.clearMemory()

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

  await t.test('10. Session ownership protects analysis endpoints from unauthorized access', async () => {
    const otherCookie = await initSessionWithConsent()

    const res = await request(app)
      .post(`/api/v1/analysis/${labDocId}/explain`)
      .set('Cookie', otherCookie)
      .send({ language: 'en' })

    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'UNAUTHORIZED_ACCESS')
  })

  await t.test('11. Zod schema strictly validates and rejects malformed explanation output', () => {
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

  await t.test('12. Cascade delete purges analysis records along with document', async () => {
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
