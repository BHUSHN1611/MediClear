import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckSquare, ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import SafetyNotice from '../components/safety/SafetyNotice'
import { DEMO_DOCUMENT_ID, DEMO_EXPLANATION_DATA } from '../data/mockData'

export default function ChecklistPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId = DEMO_DOCUMENT_ID } = useParams()

  const content = language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en
  const checklistItems = content.checklist || []

  // Track checked states in local component state
  const [completedMap, setCompletedMap] = useState({})

  const toggleItem = (id) => {
    setCompletedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const completedCount = Object.values(completedMap).filter(Boolean).length
  const totalCount = checklistItems.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link to={`/explanation/${documentId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>{t('common.back')} to Explanation</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            {t('checklist.title')}
          </h1>
        </div>
        <p className="text-sm text-surface-500 pl-11">
          {t('checklist.subtitle')}
        </p>
      </div>

      <SafetyNotice />

      <Alert variant="info" title="Phase 1 Demo Mode">
        <p className="text-xs sm:text-sm">
          {t('checklist.demo_notice')}
        </p>
      </Alert>

      {/* Progress tracker */}
      <Card className="p-5 space-y-2.5 bg-white">
        <div className="flex items-center justify-between text-xs font-semibold text-surface-700">
          <span>Action Items Completed</span>
          <span>{completedCount} of {totalCount} ({progressPercent}%)</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Checklist items list */}
      <div className="space-y-3">
        {checklistItems.map((item) => {
          const isDone = !!completedMap[item.id]

          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={clsx(
                'flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none',
                isDone
                  ? 'bg-surface-50/80 border-surface-200/80 opacity-75'
                  : 'bg-white border-surface-200 hover:border-amber-300 hover:shadow-card'
              )}
            >
              <div
                className={clsx(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  isDone
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-surface-300 bg-white hover:border-amber-400'
                )}
              >
                {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={clsx(
                      'text-sm font-semibold transition-all',
                      isDone ? 'line-through text-surface-500' : 'text-surface-900'
                    )}
                  >
                    {item.title}
                  </h3>
                  <Badge variant="yellow" className="text-[10px] py-0 px-2">
                    {item.category}
                  </Badge>
                </div>
                <p
                  className={clsx(
                    'text-xs leading-relaxed',
                    isDone ? 'text-surface-400' : 'text-surface-600'
                  )}
                >
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
