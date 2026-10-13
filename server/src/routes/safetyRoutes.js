import { Router } from 'express'
import { checkSafety } from '../controllers/analysisController.js'

const router = Router()

// Deterministic medical safety check
router.post('/check', checkSafety)

export default router
