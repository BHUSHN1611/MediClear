import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { createApp } from '../src/app.js'
import { config } from '../src/config/env.js'
import { dataRepository } from '../src/services/dataRepository.js'

test('CORS and Session Header Verification for Cross-Site Deployment', async (t) => {
  const originalClientUrl = config.CLIENT_URL
  const originalRegex = config.CORS_ORIGIN_REGEX

  // Configure test client URLs and regex
  config.CLIENT_URL = 'http://localhost:5173, https://mediclear.vercel.app'
  config.CORS_ORIGIN_REGEX = '^https:\\/\\/medi-clear-[a-z0-9]+-bhushn-team\\.vercel\\.app$'

  const app = createApp()
  dataRepository.clearMemory()

  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )

  t.after(() => {
    config.CLIENT_URL = originalClientUrl
    config.CORS_ORIGIN_REGEX = originalRegex
  })

  await t.test('1. Preflight OPTIONS with allowed origin echoes origin and allows x-session-id', async () => {
    const res = await request(app)
      .options('/api/v1/documents/upload')
      .set('Origin', 'https://mediclear.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-session-id')

    assert.equal(res.status, 204)
    assert.equal(res.headers['access-control-allow-origin'], 'https://mediclear.vercel.app')
    assert.match(res.headers['access-control-allow-headers'], /x-session-id/i)
  })

  await t.test('2. Preflight OPTIONS with regex-matched dynamic Vercel origin is allowed', async () => {
    const res = await request(app)
      .options('/api/v1/documents/upload')
      .set('Origin', 'https://medi-clear-es1ehx7zi-bhushn-team.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-session-id')

    assert.equal(res.status, 204)
    assert.equal(res.headers['access-control-allow-origin'], 'https://medi-clear-es1ehx7zi-bhushn-team.vercel.app')
  })

  await t.test('3. Preflight OPTIONS with unallowed evil origin has no Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .options('/api/v1/documents/upload')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-session-id')

    assert.equal(res.headers['access-control-allow-origin'], undefined)
  })

  let testDocId = null
  const session1 = uuidv4()
  const session2 = uuidv4()

  await t.test('4. Consent and upload using only x-session-id header returns 201 and no Set-Cookie', async () => {
    // 1. Consent with x-session-id
    const consentRes = await request(app)
      .post('/api/v1/consents')
      .set('x-session-id', session1)
      .send({
        consentGiven: true,
        consentTypes: ['data_processing', 'ephemeral_storage'],
      })

    assert.equal(consentRes.status, 201)
    assert.equal(consentRes.headers['set-cookie'], undefined, 'No Set-Cookie header when x-session-id is supplied')

    // 2. Upload with x-session-id
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('x-session-id', session1)
      .attach('file', validPngBuffer, 'report.png')

    assert.equal(uploadRes.status, 201)
    assert.equal(uploadRes.headers['set-cookie'], undefined, 'No Set-Cookie header on upload when x-session-id is supplied')
    assert.ok(uploadRes.body.documentId)
    testDocId = uploadRes.body.documentId
  })

  await t.test('5. A different x-session-id cannot access the first session document', async () => {
    // Attempt access with session2
    const res = await request(app)
      .get(`/api/v1/documents/${testDocId}`)
      .set('x-session-id', session2)

    assert.notEqual(res.status, 200, 'Different session must never receive 200 OK')
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, received ${res.status}`)
    if (res.status === 403) {
      assert.equal(res.body.code, 'UNAUTHORIZED_ACCESS')
    }
  })
})
