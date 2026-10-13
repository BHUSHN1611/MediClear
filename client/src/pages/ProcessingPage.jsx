import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, FileSearch, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { DEMO_DOCUMENT_ID } from '../data/mockData'
import { documentService } from '../services/documentService'

export default function ProcessingPage() {
  const { t } = useTranslation()
  const { documentId = DEMO_DOCUMENT_ID } = useParams()
  const navigate = useNavigate()

  const [currentStage, setCurrentStage] = useState(0)

  const stages = [
    { label: t('processing.extracting'), icon: FileSearch },
    { label: t('processing.analyzing'), icon: Sparkles },
    { label: t('processing.almost_done'), icon: CheckCircle2 },
  ]

  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    let isCancelled = false

    async function runExtraction() {
      if (documentId && documentId !== DEMO_DOCUMENT_ID) {
        try {
          await documentService.extractDocument(documentId)
        } catch (err) {
          if (!isCancelled) {
            console.warn('Extraction notice:', err.message)
            // If document was explicitly marked unreadable
            if (err.status === 400 || err.code === 'UNREADABLE_DOCUMENT') {
              setErrorMessage('The uploaded document is blurry, corrupted, or unreadable. Please upload a clear photo or PDF.')
              return
            }
          }
        }
      }

      const t1 = setTimeout(() => setCurrentStage(1), 1000)
      const t2 = setTimeout(() => setCurrentStage(2), 2000)
      const t3 = setTimeout(() => {
        if (!isCancelled) navigate(`/extracted/${documentId}`)
      }, 3000)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }

    runExtraction()

    return () => {
      isCancelled = true
    }
  }, [documentId, navigate])

  if (errorMessage) {
    return (
      <div className="max-w-md mx-auto my-auto space-y-6 text-center py-12">
        <Card className="p-8 space-y-6 shadow-card-md border-danger-200">
          <div className="h-16 w-16 mx-auto rounded-full bg-danger-50 flex items-center justify-center text-danger-600">
            <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-surface-900">{t('processing.error_title')}</h2>
            <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">{errorMessage}</p>
          </div>
          <Link to="/upload" className="block pt-2">
            <Button variant="primary" size="md" className="w-full">
              <span>{t('processing.retry')}</span>
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto my-auto space-y-6 text-center py-12">
      <Card className="p-8 sm:p-10 space-y-8 shadow-card-md">
        <div className="relative flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary-50 flex items-center justify-center border-4 border-primary-100">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-surface-900">
            {t('processing.title')}
          </h1>
          <p className="text-xs text-surface-500">
            Document ID: <code className="bg-surface-100 px-1.5 py-0.5 rounded text-surface-700">{documentId}</code>
          </p>
        </div>

        {/* Multi-stage animation */}
        <div className="space-y-3 text-left bg-surface-50 p-4 rounded-xl border border-surface-200">
          {stages.map((stg, idx) => {
            const Icon = stg.icon
            const isDone = idx < currentStage
            const isCurrent = idx === currentStage

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 text-xs sm:text-sm transition-all duration-300 ${
                  isDone
                    ? 'text-teal-700 font-medium'
                    : isCurrent
                    ? 'text-primary-700 font-semibold'
                    : 'text-surface-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-primary-600 animate-spin shrink-0" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" />
                )}
                <span>{stg.label}</span>
              </div>
            )
          })}
        </div>

        {/* Demo fast-forward */}
        <div className="pt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/extracted/${documentId}`)}
            className="text-xs text-surface-500 hover:text-surface-700"
          >
            <span>Skip simulation & view data</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
