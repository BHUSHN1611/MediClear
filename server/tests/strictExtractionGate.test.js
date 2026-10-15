import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { dataRepository } from '../src/services/dataRepository.js'
import { storageService } from '../src/services/storageService.js'
import { setMockGeminiClient, resetMockGeminiClient } from '../src/config/gemini.js'
import { createMockGeminiClient } from './mockGemini.js'

test('Strict Document Type Gate & Multimodal Extraction Verification', async (t) => {
  const app = createApp()
  dataRepository.clearMemory()
  setMockGeminiClient(createMockGeminiClient())

  let sessionCookie = null

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

  // 1. Supported lab report image -> fields extracted, status 'extracted'
  await t.test('1. Supported lab report image (PNG) extracts real fields and sets status to extracted', async () => {
    // Valid minimal 1x1 PNG buffer recognized by file-type
    const labPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', labPngBuffer, 'lab_results.png')

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 200)
    assert.equal(extractRes.body.status, 'extracted')
    assert.equal(extractRes.body.documentType, 'lab_report')
    assert.ok(extractRes.body.fieldsCount > 0)

    // Verify fields stored
    const dataRes = await request(app)
      .get(`/api/v1/documents/${docId}/extracted-data`)
      .set('Cookie', sessionCookie)

    assert.equal(dataRes.status, 200)
    assert.ok(dataRes.body.fields.length >= 4)
  })

  // 2. Supported prescription PDF -> extracted
  await t.test('2. Supported prescription PDF extracts medications verbatim', async () => {
    const rxPdfBuffer = Buffer.from('%PDF-1.4\nRx Prescription Atorvastatin 10 mg Metformin 500 mg\n%%EOF')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', rxPdfBuffer, 'prescription.pdf')

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 200)
    assert.equal(extractRes.body.status, 'extracted')
    assert.equal(extractRes.body.documentType, 'prescription')
    assert.ok(extractRes.body.fieldsCount >= 2)
  })

  // 3. Supported discharge PDF -> extracted
  await t.test('3. Supported discharge instructions PDF extracts clinical care notes', async () => {
    const dischargePdfBuffer = Buffer.from('%PDF-1.4\nHospital Discharge Instructions Acute Gastroenteritis\n%%EOF')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', dischargePdfBuffer, 'discharge_summary.pdf')

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 200)
    assert.equal(extractRes.body.status, 'extracted')
    assert.equal(extractRes.body.documentType, 'discharge_instructions')
    assert.ok(extractRes.body.fieldsCount >= 2)
  })

  // 4. Unsupported doc (e.g. invoice/ID/random photo) -> 422 UNSUPPORTED_DOCUMENT_TYPE, status 'rejected', file deleted, downstream endpoints refuse
  await t.test('4. Unsupported document (invoice/ID) triggers 422, status rejected, file deletion, and downstream refusal', async () => {
    const invoicePdfBuffer = Buffer.from('%PDF-1.4\nInvoice Receipt Non-Medical Paperwork\n%%EOF')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', invoicePdfBuffer, 'invoice.pdf')

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.body.documentId

    // Get stored document to check file existence before extraction
    const docBefore = await dataRepository.findDocumentById(docId)
    assert.ok(docBefore.storedName)
    const fileExistsBefore = await storageService.fileExists(docBefore.storedName)
    assert.equal(fileExistsBefore, true)

    // Trigger extraction
    const extractRes = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 422)
    assert.equal(extractRes.body.code, 'UNSUPPORTED_DOCUMENT_TYPE')
    assert.ok(extractRes.body.reason)

    // Verify document status is 'rejected'
    const statusRes = await request(app)
      .get(`/api/v1/documents/${docId}/status`)
      .set('Cookie', sessionCookie)

    assert.equal(statusRes.status, 200)
    assert.equal(statusRes.body.status, 'rejected')
    assert.equal(statusRes.body.rejectionCode, 'UNSUPPORTED_DOCUMENT_TYPE')

    // Verify file deleted immediately from storage (privacy requirement)
    const fileExistsAfter = await storageService.fileExists(docBefore.storedName)
    assert.equal(fileExistsAfter, false)

    // Verify downstream endpoints REFUSE (422) for rejected document
    const extractedDataRes = await request(app)
      .get(`/api/v1/documents/${docId}/extracted-data`)
      .set('Cookie', sessionCookie)
    assert.equal(extractedDataRes.status, 422)

    const patchRes = await request(app)
      .patch(`/api/v1/documents/${docId}/extracted-data`)
      .set('Cookie', sessionCookie)
      .send({ fields: [{ id: 'f1', value: '100' }] })
    assert.equal(patchRes.status, 422)

    const explainRes = await request(app)
      .post(`/api/v1/analysis/${docId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    assert.equal(explainRes.status, 422)

    const checklistRes = await request(app)
      .post(`/api/v1/checklists/${docId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    assert.equal(checklistRes.status, 422)

    const questionsRes = await request(app)
      .post(`/api/v1/questions/${docId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    assert.equal(questionsRes.status, 422)
  })

  // 5. Blurry/unreadable -> 422 UNREADABLE_DOCUMENT
  await t.test('5. Blurry or corrupted document triggers 422 UNREADABLE_DOCUMENT', async () => {
    const blurryBuffer = Buffer.from('%PDF-1.4\nblurry unreadable MALFORMED_CORRUPTED_DOCUMENT\n%%EOF')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', blurryBuffer, 'blurry.pdf')

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 422)
    assert.equal(extractRes.body.code, 'UNREADABLE_DOCUMENT')
    assert.ok(extractRes.body.reason)

    const statusRes = await request(app)
      .get(`/api/v1/documents/${docId}/status`)
      .set('Cookie', sessionCookie)

    assert.equal(statusRes.status, 200)
    assert.equal(statusRes.body.status, 'rejected')
    assert.equal(statusRes.body.rejectionCode, 'UNREADABLE_DOCUMENT')
  })

  // 6. No GEMINI_API_KEY -> 503 GEMINI_NOT_CONFIGURED, no fake data
  await t.test('6. Unconfigured Gemini API returns 503 GEMINI_NOT_CONFIGURED with zero fake data', async () => {
    // Temporarily reset mock client and unset GEMINI_API_KEY
    resetMockGeminiClient()
    const savedKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    try {
      const validPdf = Buffer.from('%PDF-1.4\nLab Report\n%%EOF')
      const uploadRes = await request(app)
        .post('/api/v1/documents/upload')
        .set('Cookie', sessionCookie)
        .attach('file', validPdf, 'report.pdf')

      assert.equal(uploadRes.status, 201)
      const docId = uploadRes.body.documentId

      const extractRes = await request(app)
        .post(`/api/v1/documents/${docId}/extract`)
        .set('Cookie', sessionCookie)

      assert.equal(extractRes.status, 503)
      assert.equal(extractRes.body.code, 'GEMINI_NOT_CONFIGURED')

      // Ensure no fake data was inserted
      const dataRes = await request(app)
        .get(`/api/v1/documents/${docId}/extracted-data`)
        .set('Cookie', sessionCookie)

      assert.equal(dataRes.status, 404)
    } finally {
      // Restore key and mock client
      if (savedKey) process.env.GEMINI_API_KEY = savedKey
      setMockGeminiClient(createMockGeminiClient())
    }
  })

  // 7. Non-PDF/JPG/PNG upload (e.g. .gif, .docx, .exe renamed to .png) -> rejected at upload by magic-byte check
  await t.test('7. Spoofed file (executable renamed to .png) rejected at upload by magic bytes check', async () => {
    // Windows PE executable header: 'MZ' (0x4D 0x5A)
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', exeBuffer, 'malicious.png')

    assert.equal(uploadRes.status, 400)
    assert.equal(uploadRes.body.code, 'SPOOFED_FILE_TYPE')
  })

  await t.test('8. Non-whitelisted extension (.docx) rejected at upload', async () => {
    const docxBuffer = Buffer.from('PK\x03\x04 fake zip docx')

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', docxBuffer, 'report.docx')

    assert.equal(uploadRes.status, 400)
    assert.equal(uploadRes.body.code, 'INVALID_EXTENSION')
  })

  resetMockGeminiClient()
})
