import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { dataRepository } from '../src/services/dataRepository.js'
import { maskPii } from '../src/utils/maskPii.js'
import { ExtractionOutputSchema, UserCorrectionSchema } from '../src/validators/aiOutputSchemas.js'

test('Phase 3 — Document Text Extraction & Editable Review Workflow', async (t) => {
  const app = createApp()
  dataRepository.clearMemory()

  let sessionCookie = null
  let labDocId = null
  let rxDocId = null
  let unreadableDocId = null

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

  await t.test('1. PII Masking utility redacts names, phones, Aadhaar, and IDs', () => {
    const piiText = `Patient Name: Ramesh Sharma, Phone: 9876543210, Aadhaar: 1234 5678 9012, UHID: UH-99882`
    const { maskedText, wasRedacted, counts } = maskPii(piiText)

    assert.equal(wasRedacted, true)
    assert.ok(counts.phones >= 1)
    assert.ok(counts.aadhaar >= 1)
    assert.ok(!maskedText.includes('9876543210'))
    assert.ok(!maskedText.includes('1234 5678 9012'))
    assert.ok(maskedText.includes('[REDACTED_PHONE]'))
    assert.ok(maskedText.includes('[REDACTED_AADHAAR]'))
  })

  await t.test('2. Upload and extract synthetic Lab Report successfully', async () => {
    const labPdfBuffer = Buffer.from(
      '%PDF-1.4\nComprehensive Metabolic & Lipid Panel\nFasting Blood Glucose: 118 mg/dL (70-99)\nTotal Cholesterol: 224 mg/dL (<200)\nHDL Cholesterol: 42 mg/dL\nLDL Cholesterol: 148 mg/dL\nSerum Triglycerides: 170 mg/dL\nFaint stamp on bottom margin.\n%%EOF'
    )

    // Upload
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', labPdfBuffer, 'Lab_Report.pdf')

    assert.equal(uploadRes.status, 201)
    labDocId = uploadRes.body.documentId

    // Extract
    const extractRes = await request(app)
      .post(`/api/v1/documents/${labDocId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 200)
    assert.equal(extractRes.body.status, 'extracted')
    assert.equal(extractRes.body.documentType, 'lab_report')
    assert.ok(extractRes.body.fieldsCount > 0)
    assert.ok(extractRes.body.uncertainties.length > 0)
  })

  await t.test('3. Fetch extracted structured data via GET /documents/:id/extracted-data', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.equal(res.body.documentType, 'lab_report')
    assert.ok(Array.isArray(res.body.fields))
    assert.ok(res.body.fields.length >= 4)

    // Validate structured payload conforms to Zod schema
    const validation = ExtractionOutputSchema.safeParse({
      documentType: res.body.documentType,
      fields: res.body.fields,
      uncertainties: res.body.uncertainties,
      rawText: 'mock verified',
      isUnreadable: false,
    })
    assert.equal(validation.success, true)

    // Verify Glucose was extracted with high confidence
    const glucose = res.body.fields.find((f) => f.key.includes('Glucose'))
    assert.ok(glucose)
    assert.equal(glucose.value, '118')
    assert.equal(glucose.unit, 'mg/dL')
    assert.equal(glucose.confidence, 'high')
    assert.equal(glucose.status, 'high')
  })

  await t.test('4. Manual user correction via PATCH /documents/:id/extracted-data', async () => {
    const getRes = await request(app)
      .get(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', sessionCookie)

    const firstField = getRes.body.fields[0]

    // User corrects value
    const patchRes = await request(app)
      .patch(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', sessionCookie)
      .send({
        fields: [{ id: firstField.id, value: '112', unit: firstField.unit }],
      })

    assert.equal(patchRes.status, 200)
    assert.ok(patchRes.body.fields)

    // Verify updated field has isUserCorrected: true and originalValue preserved
    const updatedField = patchRes.body.fields.find((f) => f.id === firstField.id)
    assert.equal(updatedField.value, '112')
    assert.equal(updatedField.isUserCorrected, true)
    assert.equal(updatedField.originalValue, firstField.value)
  })

  await t.test('5. Session ownership protects extracted data from unauthorized access', async () => {
    // Generate an unauthorized session
    const unauthorizedCookie = await initSessionWithConsent()

    // Unauthorized GET
    const getRes = await request(app)
      .get(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', unauthorizedCookie)

    assert.equal(getRes.status, 403)
    assert.equal(getRes.body.code, 'UNAUTHORIZED_ACCESS')

    // Unauthorized PATCH
    const patchRes = await request(app)
      .patch(`/api/v1/documents/${labDocId}/extracted-data`)
      .set('Cookie', unauthorizedCookie)
      .send({ fields: [{ id: 'f1', value: '999' }] })

    assert.equal(patchRes.status, 403)
    assert.equal(patchRes.body.code, 'UNAUTHORIZED_ACCESS')
  })

  await t.test('6. Extract synthetic Prescription document', async () => {
    const rxPdfBuffer = Buffer.from(
      '%PDF-1.4\nRx Prescription\nAtorvastatin 10 mg tablet once daily\nMetformin 500 mg tablet twice daily\n%%EOF'
    )

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', rxPdfBuffer, 'Prescription.pdf')

    rxDocId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${rxDocId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 200)
    assert.equal(extractRes.body.documentType, 'prescription')
    assert.ok(extractRes.body.fieldsCount >= 2)
  })

  await t.test('7. Handle unreadable or corrupted document gracefully', async () => {
    const corruptBuffer = Buffer.from('%PDF-1.4\nMALFORMED_CORRUPTED_DOCUMENT\n%%EOF')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', corruptBuffer, 'Corrupted.pdf')

    unreadableDocId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${unreadableDocId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 200)
    assert.equal(extractRes.body.status, 'error')
    assert.equal(extractRes.body.isUnreadable, true)
    assert.equal(extractRes.body.fieldsCount, 0)
    assert.ok(extractRes.body.uncertainties.length > 0)
  })
})
