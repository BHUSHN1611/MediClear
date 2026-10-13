import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle, ArrowLeft, Copy, Check, MessageSquare } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import SafetyNotice from '../components/safety/SafetyNotice'
import { DEMO_DOCUMENT_ID, DEMO_EXPLANATION_DATA } from '../data/mockData'

export default function DoctorQuestionsPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId = DEMO_DOCUMENT_ID } = useParams()

  const content = language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en
  const questions = content.questions || []

  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

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
      </div>

      <SafetyNotice />

      <Alert variant="info" title="Phase 1 Demo Mode">
        <p className="text-xs sm:text-sm">
          {t('questions.demo_notice')}
        </p>
      </Alert>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((item, idx) => {
          const isCopied = copiedId === item.id

          return (
            <Card
              key={item.id}
              className="p-5 flex items-start justify-between gap-4 hover:shadow-card-md transition-shadow"
            >
              <div className="flex items-start gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mt-0.5">
                  {idx + 1}
                </span>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="teal" className="text-[10px] py-0 px-2">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-sm sm:text-base font-medium text-surface-900 leading-snug">
                    {item.question}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopySingle(item.id, item.question)}
                title="Copy question"
                className="shrink-0 text-surface-400 hover:text-surface-700"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-teal-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
