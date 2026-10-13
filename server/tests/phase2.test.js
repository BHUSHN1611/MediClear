import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { storageService } from '../src/services/storageService.js'
import { dataRepository } from '../src/services/dataRepository.js'

test('Phase 2 — Backend Foundation, Consent & Secure Document Upload', async (t) => {
  const app = createApp()

  // Reset in-memory test store before starting
  dataRepository.clearMemory()

  // Synthetic valid PDF buffer with standard PDF header
  const validSyntheticPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (Synthetic Lab Report) >>\nendobj\ntrailer\n<<>>\n%%EOF'
  )

  // Spoofed text file claiming to be a PDF
  const spoofedFakePdf = Buffer.from('malicious payload disguised as a document')

  // Variable to hold session cookies between requests
  let sessionCookie = null
  let uploadedDocumentId = null

  await t.test('1. Health check & anonymous session cookie initialization', async () => {
    const res = await request(app).get('/api/v1/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.status, 'healthy')
    assert.ok(res.body.version)

    // Check that HTTP-only session cookie is set
    const setCookie = res.headers['set-cookie']
    assert.ok(setCookie, 'Expected set-cookie header on initial request')
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie
    assert.match(cookieStr, /mc_session=/)
    assert.match(cookieStr, /HttpOnly/i)

    sessionCookie = cookieStr.split(';')[0]
  })

  await t.test('2. Uploading document without consent must return 403 Forbidden', async () => {
    // Generate a fresh session without consent
    const freshSessionRes = await request(app).get('/api/v1/health')
    const freshCookie = freshSessionRes.headers['set-cookie'][0].split(';')[0]

    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', freshCookie)
      .attach('file', validSyntheticPdf, 'report.pdf')

    assert.equal(res.status, 403)
    assert.equal(res.body.code, 'CONSENT_REQUIRED')
  })

  await t.test('3. Recording patient consent successfully', async () => {
    const res = await request(app)
      .post('/api/v1/consents')
      .set('Cookie', sessionCookie)
      .send({ language: 'en', version: '1.0' })

    assert.equal(res.status, 201)
    assert.ok(res.body.consentId)
    assert.ok(res.body.consentedAt)
    assert.equal(res.body.language, 'en')

    // Verify status endpoint reflects active consent
    const statusRes = await request(app)
      .get('/api/v1/consents/status')
      .set('Cookie', sessionCookie)

    assert.equal(statusRes.status, 200)
    assert.equal(statusRes.body.hasConsented, true)
  })

  await t.test('4. Uploading without a file returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'MISSING_FILE')
  })

  await t.test('5. Uploading disallowed file extension returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', Buffer.from('script contents'), 'malicious.exe')

    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'INVALID_EXTENSION')
  })

  await t.test('6. Uploading spoofed file (invalid magic bytes) returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', spoofedFakePdf, 'spoofed.pdf')

    assert.equal(res.status, 400)
    assert.equal(res.body.code, 'SPOOFED_FILE_TYPE')
  })

  await t.test('7. Uploading valid synthetic PDF succeeds with private storage & 30-day TTL', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validSyntheticPdf, 'Sample_Lipid_Panel_Report.pdf')

    assert.equal(res.status, 201)
    assert.ok(res.body.documentId)
    assert.equal(res.body.status, 'uploaded')
    assert.equal(res.body.originalName, 'Sample_Lipid_Panel_Report.pdf')
    assert.equal(res.body.mimeType, 'application/pdf')
    assert.ok(res.body.expiresAt)

    uploadedDocumentId = res.body.documentId

    // Verify file exists in private storage
    const docRecord = await dataRepository.findDocumentById(uploadedDocumentId)
    assert.ok(docRecord.storedName)
    const exists = await storageService.fileExists(docRecord.storedName)
    assert.equal(exists, true)
  })

  await t.test('8. Fetching document metadata with session ownership check', async () => {
    // Authorized session
    const res = await request(app)
      .get(`/api/v1/documents/${uploadedDocumentId}`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, uploadedDocumentId)
    assert.equal(res.body.status, 'uploaded')

    // Unauthorized session (different cookie)
    const otherSessionRes = await request(app).get('/api/v1/health')
    const otherCookie = otherSessionRes.headers['set-cookie'][0].split(';')[0]

    const unauthorizedRes = await request(app)
      .get(`/api/v1/documents/${uploadedDocumentId}`)
      .set('Cookie', otherCookie)

    assert.equal(unauthorizedRes.status, 403)
    assert.equal(unauthorizedRes.body.code, 'UNAUTHORIZED_ACCESS')
  })

  await t.test('9. Polling document status', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${uploadedDocumentId}/status`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.equal(res.body.documentId, uploadedDocumentId)
    assert.equal(res.body.status, 'uploaded')
  })

  await t.test('10. Cascade document deletion removes file from storage and database', async () => {
    const docRecord = await dataRepository.findDocumentById(uploadedDocumentId)
    const storedName = docRecord.storedName

    const res = await request(app)
      .delete(`/api/v1/documents/${uploadedDocumentId}`)
      .set('Cookie', sessionCookie)

    assert.equal(res.status, 200)
    assert.ok(res.body.message)

    // Verify physical file was deleted from private storage
    const exists = await storageService.fileExists(storedName)
    assert.equal(exists, false, 'Physical stored file must be deleted upon document deletion')

    // Verify document record is deleted
    const getDeletedRes = await request(app)
      .get(`/api/v1/documents/${uploadedDocumentId}`)
      .set('Cookie', sessionCookie)

    assert.equal(getDeletedRes.status, 404)
  })
})
