import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { dataRepository } from '../src/services/dataRepository.js'
import { setMockGeminiClient, resetMockGeminiClient } from '../src/config/gemini.js'
import { createMockGeminiClient } from './mockGemini.js'

test('Data Consistency and Cost Verification', async (t) => {
  const app = createApp()
  dataRepository.clearMemory()

  let geminiCallCount = 0
  const baseMock = createMockGeminiClient()

  const countingMock = {
    models: {
      generateContent: async (args) => {
        geminiCallCount++
        return baseMock.models.generateContent(args)
      },
    },
  }

  setMockGeminiClient(countingMock)

  t.after(() => {
    resetMockGeminiClient()
  })

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

  const sessionCookie = await initSessionWithConsent()

  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )

  // 1. Extract twice -> second call returns cached, Gemini called once
  await t.test('1. Extract twice returns cached result on second call without re-calling Gemini', async () => {
    geminiCallCount = 0

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validPngBuffer, 'lab1.png')

    assert.equal(uploadRes.status, 201)
    const docId = uploadRes.body.documentId

    // First extraction
    const extract1 = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extract1.status, 200)
    assert.equal(extract1.body.status, 'extracted')
    assert.equal(geminiCallCount, 1)

    // Second extraction
    const extract2 = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extract2.status, 200)
    assert.equal(extract2.body.cached, true)
    assert.equal(geminiCallCount, 1, 'Gemini should NOT be called on second extraction')
  })

  // 2. Extract, PATCH a field, extract again -> the user's corrected value is preserved
  await t.test('2. Extract, PATCH a field, extract again preserves user corrected value', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validPngBuffer, 'lab2.png')

    const docId = uploadRes.body.documentId

    // Initial extraction
    await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    // User corrects a field
    const patchRes = await request(app)
      .patch(`/api/v1/documents/${docId}/extracted-data`)
      .set('Cookie', sessionCookie)
      .send({
        fields: [
          {
            id: 'f1',
            key: 'Hemoglobin',
            value: '9.0',
            unit: 'g/dL',
            referenceRange: '13.0 - 17.0',
            status: 'low',
            confidence: 'high',
            isUserCorrected: true,
          },
        ],
      })

    assert.equal(patchRes.status, 200)

    // Extract again without force
    const extractAgain = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractAgain.status, 200)
    assert.equal(extractAgain.body.cached, true)

    // Check that stored field is still the user-corrected 9.0
    const checkData = await request(app)
      .get(`/api/v1/documents/${docId}/extracted-data`)
      .set('Cookie', sessionCookie)

    assert.equal(checkData.status, 200)
    const hbField = checkData.body.fields.find((f) => f.key === 'Hemoglobin')
    assert.ok(hbField, 'Hemoglobin field should exist')
    assert.equal(hbField.value, '9.0', 'Corrected value 9.0 must be preserved')
    assert.equal(hbField.isUserCorrected, true)
  })

  // 3. Two concurrent extract requests -> Gemini called once, both get 200
  await t.test('3. Two concurrent extract requests call Gemini once and both receive 200', async () => {
    geminiCallCount = 0

    // Set mock with slight delay so requests overlap in-flight
    setMockGeminiClient({
      models: {
        generateContent: async (args) => {
          geminiCallCount++
          await new Promise((resolve) => setTimeout(resolve, 80))
          return baseMock.models.generateContent(args)
        },
      },
    })

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validPngBuffer, 'lab3.png')

    const docId = uploadRes.body.documentId

    // Fire two extraction requests concurrently
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/v1/documents/${docId}/extract`).set('Cookie', sessionCookie),
      request(app).post(`/api/v1/documents/${docId}/extract`).set('Cookie', sessionCookie),
    ])

    assert.equal(res1.status, 200)
    assert.equal(res2.status, 200)
    assert.equal(res1.body.documentId, docId)
    assert.equal(res2.body.documentId, docId)
    assert.equal(geminiCallCount, 1, 'Gemini must be called only once for concurrent requests')

    // Restore standard counting mock
    setMockGeminiClient(countingMock)
  })

  // 4. Generate checklist/questions/explanation, PATCH extracted data, then GET each -> 404, regenerate -> reflects edited value
  await t.test('4. Invalidate downstream analysis/checklist/questions on extracted data edit', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validPngBuffer, 'lab4.png')

    const docId = uploadRes.body.documentId

    await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    // Generate explanation, checklist, and questions
    const expRes = await request(app)
      .post(`/api/v1/analysis/${docId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    assert.equal(expRes.status, 200)

    const chkRes = await request(app)
      .post(`/api/v1/checklists/${docId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    assert.equal(chkRes.status, 200)

    const qRes = await request(app)
      .post(`/api/v1/questions/${docId}/generate`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    assert.equal(qRes.status, 200)

    // Verify GET works before patch
    const getSummaryBefore = await request(app)
      .get(`/api/v1/analysis/${docId}/summary?language=en`)
      .set('Cookie', sessionCookie)
    assert.equal(getSummaryBefore.status, 200)

    // User edits extracted data
    const patchRes = await request(app)
      .patch(`/api/v1/documents/${docId}/extracted-data`)
      .set('Cookie', sessionCookie)
      .send({
        fields: [
          {
            id: 'f1',
            key: 'Serum Creatinine',
            value: '3.5',
            unit: 'mg/dL',
            referenceRange: '0.6 - 1.2',
            status: 'high',
            confidence: 'high',
            isUserCorrected: true,
          },
        ],
      })
    assert.equal(patchRes.status, 200)

    // Downstream data must now return 404 (invalidated)
    const getSummaryAfter = await request(app)
      .get(`/api/v1/analysis/${docId}/summary?language=en`)
      .set('Cookie', sessionCookie)
    assert.equal(getSummaryAfter.status, 404)
    assert.equal(getSummaryAfter.body.code, 'ANALYSIS_NOT_FOUND')

    const getChecklistAfter = await request(app)
      .get(`/api/v1/checklists/${docId}?language=en`)
      .set('Cookie', sessionCookie)
    assert.equal(getChecklistAfter.status, 404)

    const getQuestionsAfter = await request(app)
      .get(`/api/v1/questions/${docId}?language=en`)
      .set('Cookie', sessionCookie)
    assert.equal(getQuestionsAfter.status, 404)

    // Regenerate and verify new content reflects edited fields
    const newExp = await request(app)
      .post(`/api/v1/analysis/${docId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })
    const creatinineFact = newExp.body.extractedFacts.find((f) => f.label === 'Serum Creatinine' || f.title === 'Serum Creatinine')
    assert.ok(creatinineFact, 'Serum Creatinine fact must exist in regenerated explanation')
    assert.equal(creatinineFact.value, '3.5', 'Regenerated fact must reflect the edited 3.5 value')
  })

  // 5. POST explain twice for the same language -> Gemini called once; ?force=true -> called again
  await t.test('5. POST explain twice returns cached; force=true regenerates via Gemini', async () => {
    geminiCallCount = 0

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validPngBuffer, 'lab5.png')

    const docId = uploadRes.body.documentId

    await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    const callsAfterExtract = geminiCallCount

    // First explain call
    const explain1 = await request(app)
      .post(`/api/v1/analysis/${docId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(explain1.status, 200)
    assert.equal(geminiCallCount, callsAfterExtract + 1)

    // Second explain call (cached)
    const explain2 = await request(app)
      .post(`/api/v1/analysis/${docId}/explain`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(explain2.status, 200)
    assert.equal(explain2.body.cached, true)
    assert.equal(geminiCallCount, callsAfterExtract + 1, 'Gemini should NOT be called again on repeated explain')

    // Third explain call with ?force=true
    const explain3 = await request(app)
      .post(`/api/v1/analysis/${docId}/explain?force=true`)
      .set('Cookie', sessionCookie)
      .send({ language: 'en' })

    assert.equal(explain3.status, 200)
    assert.equal(geminiCallCount, callsAfterExtract + 2, 'Gemini SHOULD be called on force=true')
  })

  // 6. 429 error from Gemini does not trigger attempts on the other candidate models
  await t.test('6. 429 error from Gemini aborts candidate retries immediately', async () => {
    const modelsTried = []

    setMockGeminiClient({
      models: {
        generateContent: async ({ model }) => {
          modelsTried.push(model)
          const err = new Error('{"error": {"code": 429, "message": "RESOURCE_EXHAUSTED: Quota exceeded for model"}}')
          err.status = 429
          throw err
        },
      },
    })

    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Cookie', sessionCookie)
      .attach('file', validPngBuffer, 'lab6.png')

    const docId = uploadRes.body.documentId

    const extractRes = await request(app)
      .post(`/api/v1/documents/${docId}/extract`)
      .set('Cookie', sessionCookie)

    assert.equal(extractRes.status, 502)
    assert.equal(
      modelsTried.length,
      1,
      `429 error should abort candidate loop immediately; tried: ${modelsTried.join(', ')}`
    )
  })
})
