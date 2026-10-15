import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config/env.js'
import { sessionMiddleware } from './middleware/session.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { errorHandler } from './middleware/errorHandler.js'
import apiRoutes from './routes/index.js'

export function createApp() {
  const app = express()

  // Trust proxy in production (e.g. on Render / behind reverse proxy)
  if (config.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Managed separately or via frontend bundler
      crossOriginEmbedderPolicy: false,
    })
  )

  // 2. CORS configuration (allowing client origin with credentials for HTTP-only cookies)
  const corsOriginFn = (origin, callback) => {
    // Requests with no Origin header are allowed (curl, server-to-server)
    if (!origin) {
      return callback(null, true)
    }

    const staticOrigins = (config.CLIENT_URL || '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean)

    const allowedOrigins = Array.from(
      new Set([
        ...staticOrigins,
        'https://mediclear-56uy.onrender.com',
        'http://localhost:5173',
        'http://localhost:5174',
      ])
    )

    const cleanOrigin = origin.trim().replace(/\/+$/, '')

    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true)
    }

    if (config.CORS_ORIGIN_REGEX) {
      try {
        const regex = new RegExp(config.CORS_ORIGIN_REGEX)
        if (regex.test(cleanOrigin)) {
          return callback(null, true)
        }
      } catch (err) {
        console.warn('[CORS Warning] Invalid CORS_ORIGIN_REGEX:', err.message)
      }
    }

    // Unknown origins get no CORS headers (do not throw)
    return callback(null, false)
  }

  app.use(
    cors({
      origin: corsOriginFn,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
      maxAge: 86400,
    })
  )

  // 3. Body & Cookie Parsing
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // 4. Server-managed anonymous session tracking
  app.use(sessionMiddleware)

  // 5. API Rate Limiting
  app.use('/api', apiLimiter)

  // Convenience root healthcheck alias
  app.get('/health', (req, res) => res.redirect('/api/v1/health'))

  // 6. Routes
  app.use('/api/v1', apiRoutes)

  // 7. Unknown Route 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    })
  })

  // 8. Centralized Error Handler
  app.use(errorHandler)

  return app
}

export default createApp
