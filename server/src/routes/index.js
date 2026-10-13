import { Router } from 'express'
import consentRoutes from './consentRoutes.js'
import documentRoutes from './documentRoutes.js'
import analysisRoutes from './analysisRoutes.js'
import safetyRoutes from './safetyRoutes.js'
import { isDbConnected } from '../config/db.js'

const router = Router()

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dbConnected: isDbConnected(),
    sessionActive: !!req.sessionId,
    version: '0.4.0',
    phase: 'Phase 4 — AI Explanations, Medical Glossary, Safety Guardrails',
  })
})

router.use('/consents', consentRoutes)
router.use('/documents', documentRoutes)
router.use('/analysis', analysisRoutes)
router.use('/safety', safetyRoutes)

export default router
