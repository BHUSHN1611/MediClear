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
  ArrowLeft,
  Info,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Loader2,
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
import checklistService from '../services/checklistService'
import questionService from '../services/questionService'
import SpeechReader from '../components/voice/SpeechReader'

export default function ExplanationPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId } = useParams()
  const navigate = useNavigate()

  const isDemo = !documentId || documentId === DEMO_DOCUMENT_ID
  const effectiveDocId = isDemo ? DEMO_DOCUMENT_ID : documentId

  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [realAnalysis, setRealAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(!isDemo)
  const [errorMessage, setErrorMessage] = useState(null)
  const [checklistCount, setChecklistCount] = useState(null)
  const [questionsCount, setQuestionsCount] = useState(null)

  // Default demo fallback content (strictly for demo document only)
  const demoContent = isDemo
    ? (language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en)
    : null

  // Load real analysis from backend if real document
  useEffect(() => {
    let isCancelled = false

    async function loadAnalysis() {
      if (!isDemo) {
        setIsLoading(true)
        setErrorMessage(null)
        try {
          const res = await analysisService.generateExplanation(effectiveDocId, language)
          if (isCancelled) return
          if (res) {
            setRealAnalysis(res)
          }
        } catch (err) {
          if (isCancelled) return
          console.error('Explanation generation error:', err)

          const status = err.response?.status || err.status
          const code = err.response?.data?.code || err.code

          // Route guard: if rejected or not found, redirect to /upload
          if (status === 422 || status === 404 || code === 'DOCUMENT_REJECTED' || code === 'UNSUPPORTED_DOCUMENT_TYPE') {
            navigate('/upload', { replace: true })
            return
          }

          // Try fetching existing summary
          try {
            const summaryRes = await analysisService.getAnalysisSummary(effectiveDocId, language)
            const termsRes = await analysisService.getAnalysisTerms(effectiveDocId, language).catch(() => ({ medicalTerms: [] }))
            if (isCancelled) return
            setRealAnalysis({
              ...summaryRes,
              medicalTerms: termsRes.medicalTerms || [],
            })
          } catch (fetchErr) {
            if (isCancelled) return
            setErrorMessage(err.response?.data?.error || err.message || 'Unable to generate explanation.')
          }
        } finally {
          if (!isCancelled) setIsLoading(false)
        }
      }
    }

    loadAnalysis()

    return () => {
      isCancelled = true
    }
  }, [effectiveDocId, isDemo, language, navigate])

  // Separate effect for fetching action counts (checklist & doctor questions)
  useEffect(() => {
    let isCancelled = false

    if (isDemo) {
      const fallback = language === 'hi' ? DEMO_EXPLANATION_DATA.hi : DEMO_EXPLANATION_DATA.en
      setChecklistCount(fallback?.checklist?.length ?? 0)
      setQuestionsCount(fallback?.questions?.length ?? 0)
      return
    }

    setChecklistCount(null)
    setQuestionsCount(null)

    async function loadActionCounts() {
      // Fetch or generate checklist count
      try {
        let chkData
        try {
          chkData = await checklistService.getChecklist(effectiveDocId, language)
        } catch (fetchErr) {
          if (fetchErr.response?.status === 404 || fetchErr.status === 404) {
            chkData = await checklistService.generateChecklist(effectiveDocId, language)
          } else {
            throw fetchErr
          }
        }
        if (!isCancelled && chkData?.items) {
          setChecklistCount(chkData.items.length)
        }
      } catch (chkErr) {
        if (!isCancelled) {
          const status = chkErr.response?.status || chkErr.status
          const code = chkErr.response?.data?.code || chkErr.code
          if (status === 422 || status === 404 || code === 'DOCUMENT_REJECTED' || code === 'UNSUPPORTED_DOCUMENT_TYPE') {
            navigate('/upload', { replace: true })
            return
          }
          console.warn('Could not load checklist count:', chkErr.message)
          setChecklistCount(false)
        }
      }

      // Fetch or generate questions count
      try {
        let qData
        try {
          qData = await questionService.getQuestions(effectiveDocId, language)
        } catch (fetchErr) {
          if (fetchErr.response?.status === 404 || fetchErr.status === 404) {
            qData = await questionService.generateQuestions(effectiveDocId, language)
          } else {
            throw fetchErr
          }
        }
        if (!isCancelled && qData?.questions) {
          setQuestionsCount(qData.questions.length)
        }
      } catch (qErr) {
        if (!isCancelled) {
          const status = qErr.response?.status || qErr.status
          const code = qErr.response?.data?.code || qErr.code
          if (status === 422 || status === 404 || code === 'DOCUMENT_REJECTED' || code === 'UNSUPPORTED_DOCUMENT_TYPE') {
            navigate('/upload', { replace: true })
            return
          }
          console.warn('Could not load questions count:', qErr.message)
          setQuestionsCount(false)
        }
      }
    }

    loadActionCounts()

    return () => {
      isCancelled = true
    }
  }, [effectiveDocId, isDemo, language, navigate])

  // Active content selection (Demo data strictly behind isDemo check)
  const summaryBullets = isDemo
    ? (Array.isArray(realAnalysis?.summary) ? realAnalysis.summary : (demoContent?.summary ? [demoContent.summary] : []))
    : (Array.isArray(realAnalysis?.summary) ? realAnalysis.summary : [])

  const extractedFacts = isDemo
    ? (Array.isArray(realAnalysis?.extractedFacts) && realAnalysis.extractedFacts.length > 0
        ? realAnalysis.extractedFacts.map((f) => ({
            title: f?.label || '',
            description: `${f?.value || ''} ${f?.unit || ''}`.trim(),
            source: f?.source,
          }))
        : (demoContent?.keyFacts || []))
    : (Array.isArray(realAnalysis?.extractedFacts) && realAnalysis.extractedFacts.length > 0
        ? realAnalysis.extractedFacts.map((f) => ({
            title: f?.label || '',
            description: `${f?.value || ''} ${f?.unit || ''}`.trim(),
            source: f?.source,
          }))
        : [])

  const medicalTerms = isDemo
    ? (Array.isArray(realAnalysis?.medicalTerms) && realAnalysis.medicalTerms.length > 0
        ? realAnalysis.medicalTerms.map((m) => ({
            term: m?.term || '',
            definition: m?.simpleExplanation || '',
          }))
        : (demoContent?.terms || []))
    : (Array.isArray(realAnalysis?.medicalTerms) && realAnalysis.medicalTerms.length > 0
        ? realAnalysis.medicalTerms.map((m) => ({
            term: m?.term || '',
            definition: m?.simpleExplanation || '',
          }))
        : [])

  const uncertainties = Array.isArray(realAnalysis?.uncertainties) ? realAnalysis.uncertainties : []
  const safetyFlags = Array.isArray(realAnalysis?.safetyFlags) ? realAnalysis.safetyFlags.filter(Boolean) : []

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <StepIndicator currentStep={4} language={language} />
        <Card className="p-12 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <h2 className="text-lg font-bold text-surface-900">{t('explanation.loading')}</h2>
          <p className="text-xs text-surface-500">Document ID: {effectiveDocId}</p>
        </Card>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <StepIndicator currentStep={4} language={language} />
        <Card className="p-8 text-center space-y-4 border-danger-200">
          <AlertTriangle className="h-8 w-8 text-danger-500 mx-auto" />
          <h2 className="text-lg font-bold text-surface-900">{t('explanation.error_title')}</h2>
          <p className="text-sm text-surface-600 max-w-md mx-auto">{errorMessage}</p>
          <div className="pt-2">
            <Link to="/upload">
              <Button variant="primary" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>{t('processing.btn_upload_diff')}</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <StepIndicator currentStep={4} language={language} />

      {/* Demo Notice Banner - strictly in demo mode */}
      {isDemo && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-900 text-xs leading-relaxed">
          <FileText className="h-4 w-4 shrink-0 mt-0.5 text-teal-600" />
          <span>
            <strong>Demo Sample Explanation:</strong> {t('explanation.demo_notice')}
          </span>
        </div>
      )}

      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            {t('explanation.title')}
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Document ID: <code className="bg-surface-100 px-1 py-0.5 rounded">{effectiveDocId}</code> ·{' '}
            {language === 'hi' ? 'हिन्दी में सरल व्याख्या' : 'Plain-Language Medical Explanation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS Listen Button */}
          {summaryBullets.length > 0 && (
            <SpeechReader text={summaryBullets.join('. ')} variant="teal" />
          )}

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
            {uncertainties.filter(Boolean).map((unc, idx) => (
              <li
                key={idx}
                className="text-xs bg-white/90 p-2.5 rounded-lg border border-amber-200 text-surface-700"
              >
                {typeof unc === 'string' ? unc : (unc?.reason || unc?.field || '')}
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
            {typeof checklistCount === 'number' && (
              <Badge variant="yellow">
                {t('explanation.items_count', { count: checklistCount })}
              </Badge>
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-surface-900">
              {t('explanation.checklist_heading')}
            </h3>
            <p className="text-xs text-surface-500 mt-1">
              {t('explanation.checklist_desc')}
            </p>
          </div>
          <Link to={`/checklist/${effectiveDocId}`} className="block pt-2">
            <Button variant="secondary" size="sm" className="w-full">
              <span>{t('explanation.view_checklist')}</span>
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
            {typeof questionsCount === 'number' && (
              <Badge variant="teal">
                {t('explanation.questions_count', { count: questionsCount })}
              </Badge>
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-surface-900">
              {t('explanation.questions_heading')}
            </h3>
            <p className="text-xs text-surface-500 mt-1">
              {t('explanation.questions_desc')}
            </p>
          </div>
          <Link to={`/questions/${effectiveDocId}`} className="block pt-2">
            <Button variant="secondary" size="sm" className="w-full">
              <span>{t('explanation.view_questions')}</span>
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
