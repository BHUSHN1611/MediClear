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
    // Explicit demo navigation only
    navigate(`/extracted/${DEMO_DOCUMENT_ID}`)
  }

  const handleStartExtraction = async () => {
    if (!selectedFile) return
    setIsSubmitting(true)
    setUploadError(null)

    try {
      const response = await documentService.uploadDocument(selectedFile)
      if (!response?.documentId) {
        throw new Error('Server returned invalid document response.')
      }
      navigate(`/processing/${response.documentId}`)
    } catch (err) {
      console.error('Backend upload error:', err)
      const errCode = err?.code || 'UNKNOWN_ERROR'
      const errMsg = String(err?.message || '')
      const status = err?.status

      if (errCode === 'CONSENT_REQUIRED' || status === 403) {
        setUploadError(t('upload.err_consent') || 'Patient consent must be accepted first before uploading medical documents.')
      } else if (errCode === 'FILE_TOO_LARGE' || status === 413) {
        setUploadError(t('upload.err_size') || 'File is too large. Maximum size is 10 MB.')
      } else if (
        errCode === 'INVALID_EXTENSION' ||
        errCode === 'INVALID_MIME_TYPE' ||
        errCode === 'SPOOFED_FILE_TYPE'
      ) {
        setUploadError(t('upload.err_type') || 'Unsupported file type. Please upload a PDF, JPG, JPEG, or PNG.')
      } else if (status === undefined || status === 502 || status === 503 || status === 504) {
        const baseMsg = t('upload.err_server') || 'Server unreachable. Please check your connection and try again.'
        setUploadError(`${baseMsg} The server may be waking up (Render spin-up); please retry in a minute.`)
      } else if (errCode === '404' || (status === 404 && errCode === 'UNKNOWN_ERROR')) {
        setUploadError('Cannot reach the MediClear server. Please try again later.')
      } else {
        setUploadError(errMsg || t('upload.err_generic'))
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
          {t('upload.helper_text') || 'Supported: Lab reports, Prescriptions, Discharge instructions. PDF, JPG, PNG.'}
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
        <Alert variant="danger" title="Upload Failed">
          <p className="text-xs sm:text-sm">{uploadError}</p>
        </Alert>
      )}

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
