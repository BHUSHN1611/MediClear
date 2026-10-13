import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, FileSearch, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { DEMO_DOCUMENT_ID } from '../data/mockData'

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

  useEffect(() => {
    const t1 = setTimeout(() => setCurrentStage(1), 1200)
    const t2 = setTimeout(() => setCurrentStage(2), 2400)
    const t3 = setTimeout(() => {
      navigate(`/extracted/${documentId}`)
    }, 3600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [documentId, navigate])

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
