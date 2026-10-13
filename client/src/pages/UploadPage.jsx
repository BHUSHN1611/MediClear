import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ShieldCheck, FileCheck, Info } from 'lucide-react'
import { useConsent } from '../context/ConsentContext'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import StepIndicator from '../components/common/StepIndicator'
import UploadZone from '../components/document/UploadZone'
import { DEMO_DOCUMENT_ID } from '../data/mockData'
import { documentService } from '../services/documentService'

export default function UploadPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { hasConsented } = useConsent()
  const navigate = useNavigate()

  const [selectedFile, setSelectedFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const handleUseSample = () => {
    // Valid minimal PDF header with magic bytes %PDF-1.4
    const validPdfBytes = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Synthetic Lab Report) >>\nendobj\ntrailer\n<<>>\n%%EOF'
    const mockFile = new File([validPdfBytes], 'Sample_Lipid_Panel_Report.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    })
    setSelectedFile(mockFile)
    setUploadError(null)
  }

  const handleStartExtraction = async () => {
    if (!selectedFile) return
    setIsSubmitting(true)
    setUploadError(null)

    try {
      const response = await documentService.uploadDocument(selectedFile)
      const docId = response?.documentId || DEMO_DOCUMENT_ID
      navigate(`/processing/${docId}`)
    } catch (err) {
      console.warn('Backend upload notice:', err.message)
      // If error is consent-related, prompt user
      if (err.code === 'CONSENT_REQUIRED') {
        setUploadError('Patient consent must be accepted first before uploading.')
      } else {
        // Fallback for resilient preview
        navigate(`/processing/${DEMO_DOCUMENT_ID}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepIndicator currentStep={2} language={language} />

      <div className="space-y-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
          {t('upload.title')}
        </h1>
        <p className="text-sm text-surface-500">
          {t('upload.subtitle')}
        </p>
      </div>

      {!hasConsented && (
        <Alert variant="warning" title="Consent Not Recorded">
          <p className="text-xs sm:text-sm">
            You haven't accepted the privacy terms yet.{' '}
            <Link to="/consent" className="underline font-semibold">
              Please review and accept our consent notice
            </Link>{' '}
            before submitting medical documents.
          </p>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="danger" title="Upload Blocked">
          <p className="text-xs sm:text-sm">{uploadError}</p>
        </Alert>
      )}

      {/* Demo mode banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary-50/70 border border-primary-200/50 text-primary-800 text-xs leading-relaxed">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary-600" />
        <span>
          <strong>Phase 1 Preview Mode:</strong> File selection, validation, and layout are active.
          Document processing connects to synthetic clinical records until backend services are initialized in Phase 2.
        </span>
      </div>

      <Card className="p-6 space-y-6">
        <UploadZone
          selectedFile={selectedFile}
          onFileSelect={(file) => setSelectedFile(file)}
          onClearFile={() => setSelectedFile(null)}
          onUseSample={handleUseSample}
          disabled={isSubmitting}
        />

        <div className="text-xs text-surface-500 bg-surface-50 p-3.5 rounded-xl border border-surface-200 leading-relaxed">
          {t('upload.note')}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-surface-100">
          <Link to="/consent" className="w-full sm:w-auto">
            <Button variant="ghost" size="md" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>{t('common.back')}</span>
            </Button>
          </Link>

          <Button
            size="lg"
            variant="primary"
            onClick={handleStartExtraction}
            disabled={!selectedFile || isSubmitting}
            loading={isSubmitting}
            className="w-full sm:w-auto shadow-sm"
          >
            <span>{t('upload.upload_btn')}</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
