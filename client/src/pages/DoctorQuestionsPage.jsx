import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle, ArrowLeft, Copy, Check, MessageSquare, RefreshCw, FileText, Lightbulb } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import SafetyNotice from '../components/safety/SafetyNotice'
import SpeechReader from '../components/voice/SpeechReader'
import questionService from '../services/questionService'
import { DEMO_DOCUMENT_ID, DEMO_EXPLANATION_DATA } from '../data/mockData'

export default function DoctorQuestionsPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId } = useParams()
  const navigate = useNavigate()

  const isDemo = !documentId || documentId === DEMO_DOCUMENT_ID
  const effectiveDocId = isDemo ? DEMO_DOCUMENT_ID : documentId

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadQuestions() {
      setLoading(true)
      setError(null)

      if (isDemo) {
        const fallback = language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en
        setQuestions(fallback.questions || [])
        setLoading(false)
        return
      }

      try {
        let data
        try {
          data = await questionService.getQuestions(effectiveDocId, language)
        } catch (fetchErr) {
          if (fetchErr.response?.status === 404) {
            data = await questionService.generateQuestions(effectiveDocId, language)
          } else {
            throw fetchErr
          }
        }

        if (isMounted) {
          setQuestions(data?.questions || [])
        }
      } catch (err) {
        if (isMounted) {
          const status = err.response?.status || err.status
          const code = err.response?.data?.code || err.code

          // Route guard: redirect to /upload if rejected or not found
          if (status === 422 || status === 404 || code === 'DOCUMENT_REJECTED' || code === 'UNSUPPORTED_DOCUMENT_TYPE') {
            navigate('/upload', { replace: true })
            return
          }

          setError(err.response?.data?.error || err.message || 'Unable to load consultation questions.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadQuestions()

    return () => {
      isMounted = false
    }
  }, [effectiveDocId, isDemo, language, navigate])

  const handleCopyAll = () => {
    const textToCopy = questions
      .map((q, idx) => `${idx + 1}. [${q.category}] ${q.question}`)
      .join('\n\n')

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }

  const handleCopySingle = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const readAloudText = questions
    .map((item, idx) => `Question ${idx + 1}: ${item.question}`)
    .join('. ')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button and speech reader */}
      <div className="flex items-center justify-between">
        <Link to={`/explanation/${effectiveDocId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>{t('common.back')} to Explanation</span>
          </Button>
        </Link>

        {questions.length > 0 && (
          <SpeechReader text={readAloudText} />
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
              {t('questions.title')}
            </h1>
          </div>
          <p className="text-sm text-surface-500 pl-11">
            {t('questions.subtitle')}
          </p>
        </div>

        {questions.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopyAll}
            className="self-start sm:self-auto shadow-sm"
          >
            {copiedAll ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-teal-600" />
                <span>{t('questions.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                <span>{t('questions.copy_all')}</span>
              </>
            )}
          </Button>
        )}
      </div>

      <SafetyNotice />

      {/* Consultation Preparation Disclaimer */}
      <Alert variant="info" title={language === 'hi' ? 'परामर्श तैयारी सहायता' : 'Preparation Aid Only'}>
        <p className="text-xs sm:text-sm">
          {language === 'hi'
            ? 'ये प्रश्न आपके डॉक्टर से सार्थक चर्चा में मदद के लिए तैयार किए गए हैं। मेडीक्लियर रोगों का निदान या उपचार निर्धारित नहीं करता है।'
            : 'These questions are designed to empower discussion with your doctor. They do not constitute a diagnosis or treatment plan.'}
        </p>
      </Alert>

      {error && (
        <Alert variant="danger" title="Error Loading Questions">
          <p className="text-xs sm:text-sm">{error}</p>
        </Alert>
      )}

      {loading ? (
        <Card className="p-8 text-center space-y-3">
          <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-surface-700">
            {language === 'hi' ? 'डॉक्टर प्रश्न तैयार किए जा रहे हैं...' : 'Generating doctor consultation questions...'}
          </p>
        </Card>
      ) : (
        /* Questions list */
        <div className="space-y-3">
          {questions.map((item, idx) => {
            const isCopied = copiedId === item.id
            const isDocumentSource = item.source === 'document'

            return (
              <Card
                key={item.id}
                className="p-5 flex items-start justify-between gap-4 hover:shadow-card-md transition-shadow"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mt-0.5">
                    {idx + 1}
                  </span>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isDocumentSource ? (
                        <Badge variant="teal" className="text-[10px] py-0 px-2 flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" />
                          <span>{language === 'hi' ? 'दस्तावेज़ से' : 'From Document'}</span>
                        </Badge>
                      ) : (
                        <Badge variant="gray" className="text-[10px] py-0 px-2 flex items-center gap-1">
                          <Lightbulb className="h-2.5 w-2.5" />
                          <span>{language === 'hi' ? 'सामान्य सुझाव' : 'Consultation Tip'}</span>
                        </Badge>
                      )}

                      <Badge variant="teal" className="text-[10px] py-0 px-2">
                        {item.category}
                      </Badge>
                    </div>

                    <p className="text-sm sm:text-base font-medium text-surface-900 leading-snug">
                      {item.question}
                    </p>

                    {item.rationale && (
                      <p className="text-xs text-surface-500 italic">
                        {item.rationale}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopySingle(item.id, item.question)}
                  className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-50 rounded-lg transition-colors shrink-0"
                  title="Copy question"
                  aria-label="Copy question"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-teal-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
