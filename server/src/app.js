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

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Managed separately or via frontend bundler
      crossOriginEmbedderPolicy: false,
    })
  )

  // 2. CORS configuration (allowing client origin with credentials for HTTP-only cookies)
  app.use(
    cors({
      origin: [config.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
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
