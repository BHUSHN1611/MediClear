import { Router } from 'express'
import {
  generateQuestions,
  getQuestions,
} from '../controllers/questionController.js'

const router = Router()

router.post('/:documentId/generate', generateQuestions)
router.get('/:documentId', getQuestions)

export default router
