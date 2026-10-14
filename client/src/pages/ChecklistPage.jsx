import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckSquare, ArrowLeft, Check, Sparkles, AlertCircle, RefreshCw, FileText, Lightbulb } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import SafetyNotice from '../components/safety/SafetyNotice'
import SpeechReader from '../components/voice/SpeechReader'
import checklistService from '../services/checklistService'
import { DEMO_DOCUMENT_ID, DEMO_EXPLANATION_DATA } from '../data/mockData'

export default function ChecklistPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId = DEMO_DOCUMENT_ID } = useParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadChecklist() {
      setLoading(true)
      setError(null)
      try {
        let data
        try {
          data = await checklistService.getChecklist(documentId, language)
        } catch (fetchErr) {
          if (fetchErr.response?.status === 404) {
            data = await checklistService.generateChecklist(documentId, language)
          } else {
            throw fetchErr
          }
        }

        if (isMounted) {
          setItems(data.items || [])
        }
      } catch (err) {
        if (isMounted) {
          // If in demo mode or offline, fallback to mock data
          if (documentId === DEMO_DOCUMENT_ID) {
            const fallback = language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en
            setItems(fallback.checklist || [])
          } else {
            setError(err.response?.data?.error || 'Unable to load checklist for this document.')
          }
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadChecklist()

    return () => {
      isMounted = false
    }
  }, [documentId, language])

  const toggleItem = async (id, currentStatus) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isCompleted: !currentStatus } : i))
    )

    if (documentId !== DEMO_DOCUMENT_ID) {
      setTogglingId(id)
      try {
        await checklistService.toggleItem(documentId, id, !currentStatus)
      } catch (err) {
        // Revert on error
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isCompleted: currentStatus } : i))
        )
      } finally {
        setTogglingId(null)
      }
    }
  }

  const completedCount = items.filter((i) => i.isCompleted).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Build text representation for SpeechReader
  const readAloudText = items
    .map((item, idx) => `${idx + 1}. ${item.title}. ${item.description}`)
    .join('. ')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <Link to={`/explanation/${documentId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>{t('common.back')} to Explanation</span>
          </Button>
        </Link>

        {items.length > 0 && (
          <SpeechReader text={readAloudText} />
        )}
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

      {/* Preparation Aid Clinical Disclaimer */}
      <Alert variant="info" title={language === 'hi' ? 'तैयारी सहायता सूचना' : 'Preparation Aid Only'}>
        <p className="text-xs sm:text-sm">
          {language === 'hi'
            ? 'यह चेकलिस्ट आपके डॉक्टर परामर्श की तैयारी के लिए बनाई गई है। यह कोई चिकित्सा आदेश, उपचार योजना या दवा नुस्खा नहीं है।'
            : 'These checklist items are generated to help you prepare for your consultation. They do not constitute medical orders, treatment plans, or prescription alterations.'}
        </p>
      </Alert>

      {error && (
        <Alert variant="danger" title="Error Loading Checklist">
          <p className="text-xs sm:text-sm">{error}</p>
        </Alert>
      )}

      {loading ? (
        <Card className="p-8 text-center space-y-3">
          <RefreshCw className="h-6 w-6 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-surface-700">
            {language === 'hi' ? 'चेकलिस्ट तैयार की जा रही है...' : 'Generating your personalized checklist...'}
          </p>
        </Card>
      ) : (
        <>
          {/* Progress tracker */}
          <Card className="p-5 space-y-2.5 bg-white">
            <div className="flex items-center justify-between text-xs font-semibold text-surface-700">
              <span>{language === 'hi' ? 'पूर्ण किए गए कार्य' : 'Action Items Completed'}</span>
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
            {items.map((item) => {
              const isDone = !!item.isCompleted
              const isDocumentSource = item.source === 'document'

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id, isDone)}
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

                      {/* Source attribution badge */}
                      {isDocumentSource ? (
                        <Badge variant="teal" className="text-[10px] py-0 px-2 flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" />
                          <span>{language === 'hi' ? 'दस्तावेज़ से' : 'From Document'}</span>
                        </Badge>
                      ) : (
                        <Badge variant="gray" className="text-[10px] py-0 px-2 flex items-center gap-1">
                          <Lightbulb className="h-2.5 w-2.5" />
                          <span>{language === 'hi' ? 'तैयारी सुझाव' : 'Preparation Tip'}</span>
                        </Badge>
                      )}

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
        </>
      )}
    </div>
  )
}
