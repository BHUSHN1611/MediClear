import { Router } from 'express'
import consentRoutes from './consentRoutes.js'
import documentRoutes from './documentRoutes.js'
import analysisRoutes from './analysisRoutes.js'
import safetyRoutes from './safetyRoutes.js'
import checklistRoutes from './checklistRoutes.js'
import questionRoutes from './questionRoutes.js'
import { isDbConnected } from '../config/db.js'

const router = Router()

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dbConnected: isDbConnected(),
    sessionActive: !!req.sessionId,
    version: '0.6.0',
    phase: 'Phase 5 & 6 — Checklists, Doctor Questions, and Voice Features',
  })
})

router.use('/consents', consentRoutes)
router.use('/documents', documentRoutes)
router.use('/analysis', analysisRoutes)
router.use('/safety', safetyRoutes)
router.use('/checklists', checklistRoutes)
router.use('/questions', questionRoutes)

export default router

