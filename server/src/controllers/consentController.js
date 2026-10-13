import crypto from 'crypto'
import { z } from 'zod'
import { dataRepository } from '../services/dataRepository.js'

const consentBodySchema = z.object({
  language: z.enum(['en', 'hi']).default('en'),
  version: z.string().default('1.0'),
})

/**
 * Hash IP address with SHA-256 to avoid storing raw PII
 */
function hashIp(ip) {
  if (!ip) return 'anonymous'
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

/**
 * POST /api/v1/consents
 * Records explicit patient consent for anonymous session
 */
export async function recordConsent(req, res, next) {
  try {
    const parseResult = consentBodySchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid consent parameters provided.',
        details: parseResult.error.issues,
        code: 'INVALID_CONSENT_DATA',
      })
    }

    const { language, version } = parseResult.data
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const ipHash = hashIp(ip)

    const consent = await dataRepository.createConsent({
      sessionId: req.sessionId,
      language,
      version,
      ipHash,
    })

    return res.status(201).json({
      consentId: consent._id || consent.id,
      sessionId: req.sessionId,
      consentedAt: consent.consentedAt,
      language: consent.language,
      version: consent.version,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/consents/status
 * Returns current consent status for session
 */
export async function getConsentStatus(req, res, next) {
  try {
    const consent = await dataRepository.findConsentBySession(req.sessionId)

    if (!consent) {
      return res.status(200).json({
        hasConsented: false,
        consentId: null,
      })
    }

    return res.status(200).json({
      hasConsented: true,
      consentId: consent._id || consent.id,
      consentedAt: consent.consentedAt,
      language: consent.language,
      version: consent.version,
    })
  } catch (err) {
    next(err)
  }
}
