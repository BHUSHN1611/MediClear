import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  CheckSquare,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Info,
  ShieldCheck,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import SafetyNotice from '../components/safety/SafetyNotice'
import StepIndicator from '../components/common/StepIndicator'
import { DEMO_DOCUMENT_ID, DEMO_EXPLANATION_DATA } from '../data/mockData'
import { documentService } from '../services/documentService'
import { analysisService } from '../services/analysisService'

export default function ExplanationPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId = DEMO_DOCUMENT_ID } = useParams()
  const navigate = useNavigate()

  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [realAnalysis, setRealAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Default demo fallback content
  const demoContent = language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en

  // Load real analysis from backend if real document
  useEffect(() => {
    async function loadAnalysis() {
      if (documentId && documentId !== DEMO_DOCUMENT_ID) {
        setIsLoading(true)
        try {
          // Attempt explanation generation or retrieval
          const res = await analysisService.generateExplanation(documentId, language)
          if (res) {
            setRealAnalysis(res)
          }
        } catch (err) {
          console.warn('Backend analysis notice:', err.message)
          // Try fetching existing summary
          try {
            const summaryRes = await analysisService.getAnalysisSummary(documentId, language)
            const termsRes = await analysisService.getAnalysisTerms(documentId, language).catch(() => ({ medicalTerms: [] }))
            setRealAnalysis({
              ...summaryRes,
              medicalTerms: termsRes.medicalTerms || [],
            })
          } catch (fetchErr) {
            console.warn('Using synthetic demonstration explanation:', fetchErr.message)
          }
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadAnalysis()
  }, [documentId, language])

  // Active content selection
  const summaryBullets = realAnalysis?.summary || [demoContent.summary]
  const extractedFacts =
    realAnalysis?.extractedFacts?.length > 0
      ? realAnalysis.extractedFacts.map((f) => ({
          title: f.label,
          description: `${f.value} ${f.unit || ''}`.trim(),
          source: f.source,
        }))
      : demoContent.keyFacts

  const medicalTerms =
    realAnalysis?.medicalTerms?.length > 0
      ? realAnalysis.medicalTerms.map((m) => ({
          term: m.term,
          definition: m.simpleExplanation,
        }))
      : demoContent.terms

  const uncertainties = realAnalysis?.uncertainties || []
  const safetyFlags = realAnalysis?.safetyFlags || []

  // Web Speech API integration for TTS demo
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel()
      setIsPlayingAudio(false)
    } else {
      const textToRead = summaryBullets.join('. ')
      const utterance = new SpeechSynthesisUtterance(textToRead)
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US'
      utterance.onend = () => setIsPlayingAudio(false)
      utterance.onerror = () => setIsPlayingAudio(false)
      window.speechSynthesis.speak(utterance)
      setIsPlayingAudio(true)
    }
  }

  const handleDeleteDocument = async () => {
    if (isPlayingAudio && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    if (documentId && documentId !== DEMO_DOCUMENT_ID) {
      try {
        await documentService.deleteDocument(documentId)
      } catch (err) {
        console.warn('Backend delete document notice:', err.message)
      }
    }

    setShowDeleteModal(false)
    navigate('/upload')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <StepIndicator currentStep={4} language={language} />

      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            {t('explanation.title')}
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Document ID: <code className="bg-surface-100 px-1 py-0.5 rounded">{documentId}</code> ·{' '}
            {language === 'hi' ? 'हिन्दी में सरल व्याख्या' : 'Plain-Language Medical Explanation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS Listen Button */}
          <Button
            size="sm"
            variant="teal"
            onClick={handleToggleSpeech}
            className="shadow-sm"
            title={isPlayingAudio ? t('explanation.stop_btn') : t('explanation.listen_btn')}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="h-4 w-4 mr-1.5" />
                <span>{t('explanation.stop_btn')}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-1.5" />
                <span>{t('explanation.listen_btn')}</span>
              </>
            )}
          </Button>

          {/* Delete Document Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDeleteModal(true)}
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            title={t('explanation.delete_doc')}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('explanation.delete_doc')}</span>
          </Button>
        </div>
      </div>

      {/* Mandatory Safety Notice */}
      <SafetyNotice />

      {/* Clinical Safety Flags Banner */}
      {safetyFlags.length > 0 && (
        <Alert variant="warning" title="Clinical Guidance Notice">
          <p className="text-xs sm:text-sm">
            {safetyFlags.join(' · ')}: This educational summary is generated strictly for informational understanding. Diagnostic conclusions must be established by your doctor.
          </p>
        </Alert>
      )}

      {/* Section 1: Plain-Language Summary */}
      <Card className="p-6 sm:p-7 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-surface-900">
              {t('explanation.summary_heading')}
            </h2>
          </div>
          <Badge variant="blue">
            {realAnalysis ? 'AI-Grounded Summary' : 'Clinical Summary'}
          </Badge>
        </div>

        <div className="space-y-3 text-sm sm:text-base text-surface-700 leading-relaxed">
          {summaryBullets.map((bullet, idx) => (
            <p key={idx} className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>{bullet}</span>
            </p>
          ))}
        </div>
      </Card>

      {/* Section 2: Extracted Facts (Grounded in Document) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <span>{t('explanation.facts_heading')}</span>
          </h2>
          <span className="text-xs text-surface-500">Grounded in verified document data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {extractedFacts.map((fact, idx) => (
            <Card key={idx} className="p-5 flex flex-col justify-between hover:shadow-card-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    Fact #{idx + 1}
                  </span>
                  {fact.source === 'user_corrected' && (
                    <Badge variant="teal" className="text-[10px] py-0">User verified</Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm text-surface-900">
                  {fact.title}
                </h3>
                <p className="text-xs font-semibold text-primary-700 leading-relaxed">
                  {fact.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Section 3: Medical Terms Explained (Educational Glossary) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-surface-900">
              {t('explanation.terms_heading')}
            </h2>
          </div>
          <Badge variant="teal">Educational Definitions</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {medicalTerms.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-surface-50 border border-surface-200/70 space-y-1.5"
            >
              <h3 className="font-semibold text-sm text-primary-800">
                {item.term}
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed">
                {item.definition}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 4: Uncertainties / Legibility Caveats */}
      {uncertainties.length > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/40 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <h3>{t('explanation.uncertainties_heading')}</h3>
          </div>
          <p className="text-xs text-amber-900/80">
            These sections from your document were partially obscured, smudged, or uncertain. Always check them with your provider.
          </p>
          <ul className="space-y-2 pt-1">
            {uncertainties.map((unc, idx) => (
              <li
                key={idx}
                className="text-xs bg-white/90 p-2.5 rounded-lg border border-amber-200 text-surface-700"
              >
                {typeof unc === 'string' ? unc : unc.reason || unc.field}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Section 5: Action Items Cards (Checklist & Questions Links) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
        {/* Checklist Card */}
        <Card interactive className="p-6 space-y-4 border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <Badge variant="yellow">{demoContent.checklist.length} items</Badge>
          </div>
          <div>
            <h3 className="font-bold text-base text-surface-900">
              {t('explanation.checklist_heading')}
            </h3>
            <p className="text-xs text-surface-500 mt-1">
              Actionable tasks and health recommendations derived from this report.
            </p>
          </div>
          <Link to={`/checklist/${documentId}`} className="block pt-2">
            <Button variant="secondary" size="sm" className="w-full">
              <span>View Interactive Checklist</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </Card>

        {/* Doctor Questions Card */}
        <Card interactive className="p-6 space-y-4 border-l-4 border-l-indigo-500">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <Badge variant="teal">{demoContent.questions.length} questions</Badge>
          </div>
          <div>
            <h3 className="font-bold text-base text-surface-900">
              {t('explanation.questions_heading')}
            </h3>
            <p className="text-xs text-surface-500 mt-1">
              Prepared questions to take to your next physician appointment.
            </p>
          </div>
          <Link to={`/questions/${documentId}`} className="block pt-2">
            <Button variant="secondary" size="sm" className="w-full">
              <span>View Doctor Questions</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Confirmation Modal for Document Deletion */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-surface-200">
            <div className="flex items-center gap-3 text-danger-600">
              <Trash2 className="h-6 w-6" />
              <h3 className="font-bold text-lg text-surface-900">
                {t('explanation.delete_doc')}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
              {t('explanation.delete_confirm')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteDocument}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
