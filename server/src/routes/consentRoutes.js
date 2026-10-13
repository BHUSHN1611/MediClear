import { Router } from 'express'
import { recordConsent, getConsentStatus } from '../controllers/consentController.js'

const router = Router()

router.post('/', recordConsent)
router.get('/status', getConsentStatus)

export default router
