import { Router } from 'express'
import {
  generateExplanation,
  getAnalysisSummary,
  getAnalysisTerms,
} from '../controllers/analysisController.js'

const router = Router()

// Explanation generation and retrieval
router.post('/:documentId/explain', generateExplanation)
router.get('/:documentId/summary', getAnalysisSummary)
router.get('/:documentId/terms', getAnalysisTerms)

export default router
