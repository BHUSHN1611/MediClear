import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, FileSearch, AlertOctagon, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { DEMO_DOCUMENT_ID } from '../data/mockData'
import { documentService } from '../services/documentService'

export default function ProcessingPage() {
  const { t } = useTranslation()
  const { documentId } = useParams()
  const navigate = useNavigate()

  const [errorInfo, setErrorInfo] = useState(null)
  const hasTriggeredRef = useRef(null)
  // errorInfo structure: { type: 'unsupported' | 'unreadable' | 'not_configured' | 'failed', message, reason }

  const runExtraction = useCallback(async (isCancelledRef) => {
    // If explicit demo ID, bypass API and go straight to extracted page
    if (!documentId || documentId === DEMO_DOCUMENT_ID) {
      navigate(`/extracted/${DEMO_DOCUMENT_ID}`)
      return
    }

    setErrorInfo(null)

    try {
      const res = await documentService.extractDocument(documentId)
      if (isCancelledRef.current) return

      if (res?.status === 'extracted' || res?.cached || ['extracted', 'explaining', 'ready'].includes(res?.status)) {
        navigate(`/extracted/${documentId}`)
      } else {
        setErrorInfo({
          type: 'failed',
          message: t('processing.extraction_failed_msg'),
        })
      }
    } catch (err) {
      if (isCancelledRef.current) return
      console.error('Extraction error:', err)

      const status = err.response?.status || err.status
      const code = err.response?.data?.code || err.code
      const reason = err.response?.data?.reason || err.reason || ''
      const serverMsg = err.response?.data?.message || err.message

      if (code === 'UNSUPPORTED_DOCUMENT_TYPE' || status === 422 && code !== 'UNREADABLE_DOCUMENT') {
        setErrorInfo({
          type: 'unsupported',
          title: t('processing.unsupported_title'),
          message: t('processing.unsupported_msg'),
          reason,
        })
      } else if (code === 'UNREADABLE_DOCUMENT') {
        setErrorInfo({
          type: 'unreadable',
          title: t('processing.unreadable_title'),
          message: t('processing.unreadable_msg'),
          reason,
        })
      } else if (code === 'GEMINI_NOT_CONFIGURED' || status === 503) {
        setErrorInfo({
          type: 'not_configured',
          title: t('processing.not_configured_title'),
          message: t('processing.not_configured_msg'),
          reason: serverMsg,
        })
      } else {
        setErrorInfo({
          type: 'failed',
          title: t('processing.extraction_failed_title'),
          message: serverMsg || t('processing.extraction_failed_msg'),
        })
      }
    }
  }, [documentId, navigate, t])

  useEffect(() => {
    if (hasTriggeredRef.current === documentId) return
    hasTriggeredRef.current = documentId

    const isCancelledRef = { current: false }
    runExtraction(isCancelledRef)

    return () => {
      isCancelledRef.current = true
    }
  }, [documentId, runExtraction])

  // REJECTION / ERROR STATE
  if (errorInfo) {
    const isRejection = errorInfo.type === 'unsupported' || errorInfo.type === 'unreadable'

    return (
      <div className="max-w-lg mx-auto my-auto space-y-6 text-center py-12">
        <Card className={`p-8 space-y-6 shadow-card-md ${isRejection ? 'border-amber-300' : 'border-danger-200'}`}>
          <div
            className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center ${
              isRejection ? 'bg-amber-100 text-amber-700' : 'bg-danger-50 text-danger-600'
            }`}
          >
            {isRejection ? (
              <AlertOctagon className="h-8 w-8 stroke-[2.5]" />
            ) : (
              <AlertTriangle className="h-8 w-8 stroke-[2.5]" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-surface-900">{errorInfo.title}</h2>
            <p className="text-sm text-surface-600 leading-relaxed">{errorInfo.message}</p>
            {errorInfo.reason && (
              <div className="mt-3 p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-700 italic">
                "{errorInfo.reason}"
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {isRejection ? (
              <Link to="/upload" className="block w-full">
                <Button variant="primary" size="md" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>{t('processing.btn_upload_diff')}</span>
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    hasTriggeredRef.current = null
                    const isCancelledRef = { current: false }
                    runExtraction(isCancelledRef)
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>{t('processing.btn_retry')}</span>
                </Button>
                <Link to="/upload" className="block w-full">
                  <Button variant="ghost" size="sm" className="w-full text-surface-500">
                    <span>{t('processing.btn_upload_diff')}</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // ACTIVE PROCESSING STATE
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

        <div className="flex items-center justify-center gap-2.5 text-sm text-primary-700 font-medium bg-primary-50/60 p-4 rounded-xl border border-primary-200">
          <FileSearch className="h-5 w-5 animate-pulse text-primary-600" />
          <span>{t('processing.extracting')}</span>
        </div>
      </Card>
    </div>
  )
}

