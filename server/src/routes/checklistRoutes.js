import { Router } from 'express'
import {
  generateChecklist,
  getChecklist,
  toggleChecklistItem,
} from '../controllers/checklistController.js'

const router = Router()

router.post('/:documentId/generate', generateChecklist)
router.get('/:documentId', getChecklist)
router.patch('/:documentId/items/:itemId', toggleChecklistItem)

export default router
