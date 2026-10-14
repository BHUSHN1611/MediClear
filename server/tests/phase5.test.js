import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { dataRepository } from '../src/services/dataRepository.js'
import {
  generateDeterministicChecklist,
} from '../src/services/checklistService.js'
import {
  generateDeterministicDoctorQuestions,
} from '../src/services/questionService.js'
import {
  ChecklistOutputSchema,
  DoctorQuestionsOutputSchema,
} from '../src/validators/aiOutputSchemas.js'

test('Phase 5 — Actionable Checklist and Doctor Questions', async (t) => {
  const app = createApp()
  dataRepository.clearMemory()

  let sessionCookie = null
  let labDocId = null
  let rxDocId = null

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

  // Also setup a synthetic prescription
  const rxBuffer = Buffer.from(
    '%PDF-1.4\nPrescription\nRx: Atorvastatin 10 mg\nRx: Metformin 500 mg\n%%EOF'
  )
  const rxUploadRes = await request(app)
    .post('/api/v1/documents/upload')
    .set('Cookie', sessionCookie)
    .attach('file', rxBuffer, 'Prescription.pdf')

  rxDocId = rxUploadRes.body.documentId

  await request(app)
    .post(`/api/v1/documents/${rxDocId}/extract`)
    .set('Cookie', sessionCookie)

  let firstChecklistItemId = null

  await t.test('1. Generate actionable checklist in English', async () => {
    const res = await request(app)
      .post(`/api/v1/checklists/${labDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.equal(res.body.language, 'en')
    assert.ok(Array.isArray(res.body.items))
    assert.ok(res.body.items.length >= 2)

    firstChecklistItemId = res.body.items[0].id

    // Check item fields
    assert.ok(res.body.items[0].title)
    assert.ok(res.body.items[0].category)
    assert.ok(['document', 'general_suggestion'].includes(res.body.items[0].source))
    assert.equal(res.body.items[0].isCompleted, false)

    // Verify presence of document-derived vs general suggestions
    const docItem = res.body.items.find((i) => i.source === 'document')
    const genItem = res.body.items.find((i) => i.source === 'general_suggestion')
    assert.ok(docItem, 'Should have at least one document-derived checklist item')
    assert.ok(genItem, 'Should have at least one general educational checklist item')
  })

  await t.test('2. Generate actionable checklist in Hindi (Devanagari)', async () => {
    const res = await request(app)
      .post(`/api/v1/checklists/${labDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'hi' })

    assert.equal(res.status, 200)
    assert.equal(res.body.language, 'hi')
    assert.ok(res.body.items.length >= 2)
    // Check Hindi Devanagari script presence
    assert.match(res.body.items[0].title, /[\u0900-\u097F]/)
    assert.match(res.body.items[0].description, /[\u0900-\u097F]/)
  })

  await t.test('3. Fetch stored checklist via GET /checklists/:id', async () => {
    const res = await request(app)
      .get(`/api/v1/checklists/${labDocId}?language=en`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.ok(Array.isArray(res.body.items))
    assert.ok(res.body.items.length >= 1)
  })

  await t.test('4. Toggle checklist item completion status', async () => {
    // 4a. Mark as completed
    const doneRes = await request(app)
      .patch(`/api/v1/checklists/${labDocId}/items/${firstChecklistItemId}`)
      .set('Cookie', sessionCookie)
      .send({ isCompleted: true })

    assert.equal(doneRes.status, 200)
    assert.equal(doneRes.body.isCompleted, true)

    // 4b. Mark back as incomplete
    const undoneRes = await request(app)
      .patch(`/api/v1/checklists/${labDocId}/items/${firstChecklistItemId}`)
      .set('Cookie', sessionCookie)
      .send({ isCompleted: false })

    assert.equal(undoneRes.status, 200)
    assert.equal(undoneRes.body.isCompleted, false)
  })

  await t.test('5. Toggling nonexistent checklist item returns 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/checklists/${labDocId}/items/fake_item_9999`)
      .set('Cookie', sessionCookie)
      .send({ isCompleted: true })

    assert.equal(res.status, 404)
    assert.equal(res.body.code, 'ITEM_NOT_FOUND')
  })

  await t.test('6. Generate doctor questions in English', async () => {
    const res = await request(app)
      .post(`/api/v1/questions/${labDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.equal(res.body.language, 'en')
    assert.ok(Array.isArray(res.body.questions))
    assert.ok(res.body.questions.length >= 2)

    // Verify question structure and grounding
    const docQuestion = res.body.questions.find((q) => q.source === 'document')
    assert.ok(docQuestion, 'Should include document-derived question')
    assert.ok(docQuestion.question)
    assert.ok(docQuestion.category)

    const genQuestion = res.body.questions.find((q) => q.source === 'general_suggestion')
    assert.ok(genQuestion, 'Should include general suggestion question')
  })

  await t.test('7. Generate doctor questions in Hindi (Devanagari)', async () => {
    const res = await request(app)
      .post(`/api/v1/questions/${labDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'hi' })

    assert.equal(res.status, 200)
    assert.equal(res.body.language, 'hi')
    assert.ok(res.body.questions.length >= 2)
    assert.match(res.body.questions[0].question, /[\u0900-\u097F]/)
  })

  await t.test('8. Fetch stored doctor questions via GET /questions/:id', async () => {
    const res = await request(app)
      .get(`/api/v1/questions/${labDocId}?language=en`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, labDocId)
    assert.ok(Array.isArray(res.body.questions))
    assert.ok(res.body.questions.length >= 1)
  })

  await t.test('9. Prescription-grounded checklist and doctor questions', async () => {
    const chkRes = await request(app)
      .post(`/api/v1/checklists/${rxDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(chkRes.status, 200)
    // Should contain medication instructions
    const medItem = chkRes.body.items.find((i) => i.category === 'medication')
    assert.ok(medItem)

    const qRes = await request(app)
      .post(`/api/v1/questions/${rxDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(qRes.status, 200)
    const medQ = qRes.body.questions.find((q) => q.category === 'Medications')
    assert.ok(medQ)
  })

  await t.test('10. Generation before extraction returns 400 EXTRACTION_REQUIRED', async () => {
    // Upload document but do not extract
    const unextractedPdf = Buffer.from('%PDF-1.4\nUnextracted\n%%EOF')
    const upRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', unextractedPdf, 'Doc.pdf')

    const newDocId = upRes.body.documentId

    const chkRes = await request(app)
      .post(`/api/v1/checklists/${newDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(chkRes.status, 400)
    assert.equal(chkRes.body.code, 'EXTRACTION_REQUIRED')

    const qRes = await request(app)
      .post(`/api/v1/questions/${newDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(qRes.status, 400)
    assert.equal(qRes.body.code, 'EXTRACTION_REQUIRED')
  })

  await t.test('11. Generation without consent returns 403 CONSENT_REQUIRED', async () => {
    // Session without consent
    const noConsentRes = await request(app).get('/api/v1/health')
    const noConsentCookie = noConsentRes.headers['set-cookie'][0].split(';')[0]

    const chkRes = await request(app)
      .post(`/api/v1/checklists/${labDocId}/generate`)
      .set('Cookie', noConsentCookie)
      .send({ language: 'en' })

    assert.equal(chkRes.status, 403)

    const qRes = await request(app)
      .post(`/api/v1/questions/${labDocId}/generate`)
      .set('Cookie', noConsentCookie)
      .send({ language: 'en' })

    assert.equal(qRes.status, 403)
  })

  await t.test('12. Cross-session access enforcement on checklists and questions', async () => {
    const otherCookie = await initSessionWithConsent()

    // 12a. Cross-session checklist generate
    const chkGenRes = await request(app)
      .post(`/api/v1/checklists/${labDocId}/generate`)
      .set('Cookie', otherCookie)
      .send({ language: 'en' })
    assert.equal(chkGenRes.status, 403)
    assert.equal(chkGenRes.body.code, 'UNAUTHORIZED_ACCESS')

    // 12b. Cross-session checklist get
    const chkGetRes = await request(app)
      .get(`/api/v1/checklists/${labDocId}`)
      .set('Cookie', otherCookie)
    assert.equal(chkGetRes.status, 403)
    assert.equal(chkGetRes.body.code, 'UNAUTHORIZED_ACCESS')

    // 12c. Cross-session checklist toggle
    const chkToggleRes = await request(app)
      .patch(`/api/v1/checklists/${labDocId}/items/${firstChecklistItemId}`)
      .set('Cookie', otherCookie)
      .send({ isCompleted: true })
    assert.equal(chkToggleRes.status, 403)
    assert.equal(chkToggleRes.body.code, 'UNAUTHORIZED_ACCESS')

    // 12d. Cross-session questions generate
    const qGenRes = await request(app)
      .post(`/api/v1/questions/${labDocId}/generate`)
      .set('Cookie', otherCookie)
      .send({ language: 'en' })
    assert.equal(qGenRes.status, 403)
    assert.equal(qGenRes.body.code, 'UNAUTHORIZED_ACCESS')

    // 12e. Cross-session questions get
    const qGetRes = await request(app)
      .get(`/api/v1/questions/${labDocId}`)
      .set('Cookie', otherCookie)
    assert.equal(qGetRes.status, 403)
    assert.equal(qGetRes.body.code, 'UNAUTHORIZED_ACCESS')
  })

  await t.test('13. Rejection of unsupported languages', async () => {
    const res = await request(app)
      .post(`/api/v1/checklists/${labDocId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'de' }) // German unsupported

    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'INVALID_REQUEST_PARAMETERS')
  })

  await t.test('14. Grounded fallback when parameters are empty (never invents facts)', () => {
    const emptyChecklist = generateDeterministicChecklist({
      documentId: 'doc_empty',
      fields: [],
      language: 'en',
    })

    assert.equal(emptyChecklist.items.length, 1)
    assert.equal(emptyChecklist.items[0].source, 'general_suggestion')
    assert.match(emptyChecklist.items[0].title, /Verify document/i)

    const emptyQuestions = generateDeterministicDoctorQuestions({
      documentId: 'doc_empty',
      fields: [],
      language: 'en',
    })

    assert.equal(emptyQuestions.questions.length, 1)
    assert.equal(emptyQuestions.questions[0].source, 'general_suggestion')
    assert.match(emptyQuestions.questions[0].question, /review this original document/i)
  })

  await t.test('15. Strict Zod schema validation rejects malformed checklist & question data', () => {
    const malformedChecklist = {
      documentId: 'doc-123',
      language: 'en',
      items: [{ id: '1' }], // Missing title
    }
    const chkValidation = ChecklistOutputSchema.safeParse(malformedChecklist)
    assert.equal(chkValidation.success, false)

    const malformedQuestions = {
      documentId: 'doc-123',
      language: 'en',
      questions: [{ id: '1' }], // Missing question text
    }
    const qValidation = DoctorQuestionsOutputSchema.safeParse(malformedQuestions)
    assert.equal(qValidation.success, false)
  })

  await t.test('16. Cascade deletion purges checklists and doctor questions with document', async () => {
    // Delete lab document
    const delRes = await request(app)
      .delete(`/api/v1/documents/${labDocId}`)
      .set('Cookie', sessionCookie)

    assert.equal(delRes.status, 200)

    // Check that GET checklist returns 404 DOCUMENT_NOT_FOUND
    const chkRes = await request(app)
      .get(`/api/v1/checklists/${labDocId}`)
      .set('Cookie', sessionCookie)

    assert.equal(chkRes.status, 404)
    assert.equal(chkRes.body.code, 'DOCUMENT_NOT_FOUND')

    // Check that GET questions returns 404 DOCUMENT_NOT_FOUND
    const qRes = await request(app)
      .get(`/api/v1/questions/${labDocId}`)
      .set('Cookie', sessionCookie)

    assert.equal(qRes.status, 404)
    assert.equal(qRes.body.code, 'DOCUMENT_NOT_FOUND')
  })
})
