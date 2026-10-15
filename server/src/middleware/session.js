import { v4 as uuidv4, validate as validateUuid } from 'uuid'
import { config } from '../config/env.js'

/**
 * sessionMiddleware:
 * Enforces anonymous session tracking across client requests.
 * 
 * In cross-site production deployments (e.g. client on Vercel and server on Render),
 * browsers block third-party cookies or SameSite=Lax cookies on cross-origin API calls.
 * Therefore, we prefer a valid UUID in the 'x-session-id' header over the cookie.
 * 
 * Priority:
 * 1. Valid UUID in 'x-session-id' header (used directly without emitting Set-Cookie)
 * 2. Valid UUID in mc_session cookie (used directly)
 * 3. Freshly generated UUID v4, stored in mc_session HTTP-only cookie
 * 
 * Exposes req.sessionId to downstream handlers.
 */
export function sessionMiddleware(req, res, next) {
  const headerSessionId = req.headers['x-session-id']
  const cookieSessionId = req.cookies?.[config.SESSION_COOKIE_NAME]

  let sessionId = null

  if (headerSessionId && validateUuid(headerSessionId)) {
    sessionId = headerSessionId
  } else if (cookieSessionId && validateUuid(cookieSessionId)) {
    sessionId = cookieSessionId
  } else {
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
