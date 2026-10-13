import { v4 as uuidv4, validate as validateUuid } from 'uuid'
import { config } from '../config/env.js'

/**
 * sessionMiddleware:
 * Enforces server-managed anonymous sessions using HTTP-only cookies.
 * 
 * - Checks req.cookies[mc_session].
 * - Checks fallback header 'x-session-id' for automated test runners / API clients.
 * - If absent or invalid UUID, generates a fresh cryptographically secure UUID v4.
 * - Sets HTTP-only, secure, SameSite cookie on response.
 * - Exposes req.sessionId to downstream handlers.
 */
export function sessionMiddleware(req, res, next) {
  let sessionId = req.cookies?.[config.SESSION_COOKIE_NAME] || req.headers['x-session-id']

  if (!sessionId || !validateUuid(sessionId)) {
    sessionId = uuidv4()
    
    res.cookie(config.SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: config.DOCUMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    })
  }

  req.sessionId = sessionId
  next()
}
