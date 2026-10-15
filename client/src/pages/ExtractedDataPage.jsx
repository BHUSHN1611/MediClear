import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Edit2,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  Undo2,
  FileCheck2,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import StepIndicator from '../components/common/StepIndicator'
import { DEMO_DOCUMENT_ID, DEMO_EXTRACTED_DATA } from '../data/mockData'
import { documentService } from '../services/documentService'

export default function ExtractedDataPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId } = useParams()
  const navigate = useNavigate()

  const isDemo = !documentId || documentId === DEMO_DOCUMENT_ID
  const effectiveDocId = isDemo ? DEMO_DOCUMENT_ID : documentId

  const [documentType, setDocumentType] = useState(isDemo ? DEMO_EXTRACTED_DATA.documentType || 'lab_report' : 'lab_report')
  const [fields, setFields] = useState(isDemo ? DEMO_EXTRACTED_DATA.fields : [])
  const [uncertainties, setUncertainties] = useState(isDemo ? DEMO_EXTRACTED_DATA.uncertainties : [])
  const [isLoading, setIsLoading] = useState(!isDemo)
  const [errorMessage, setErrorMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null)

  // Fetch real extracted data if available from backend
  useEffect(() => {
    let isCancelled = false

    async function loadExtractedData() {
      if (!isDemo) {
        setIsLoading(true)
        setErrorMessage(null)
        try {
          const res = await documentService.getExtractedData(effectiveDocId)
          if (isCancelled) return

          setFields(res.fields || [])
          setDocumentType(res.documentType || 'lab_report')
          setUncertainties(res.uncertainties || [])
        } catch (err) {
          if (isCancelled) return
          console.error('Failed to fetch extracted data:', err)

          const status = err.response?.status || err.status
          const code = err.response?.data?.code || err.code

          // Route guard: if rejected or not found, redirect to /upload
          if (status === 422 || status === 404 || code === 'DOCUMENT_REJECTED' || code === 'UNSUPPORTED_DOCUMENT_TYPE') {
            navigate('/upload', { replace: true })
            return
          }

          setErrorMessage(err.response?.data?.error || err.message || 'Unable to load extracted data.')
        } finally {
          if (!isCancelled) setIsLoading(false)
        }
      }
    }

    loadExtractedData()

    return () => {
      isCancelled = true
    }
  }, [effectiveDocId, isDemo, navigate])

  const handleStartEdit = (field) => {
    setEditingId(field.id)
    setEditValue(field.value)
  }

  const handleSaveEdit = async (fieldId) => {
    const currentField = fields.find((f) => f.id === fieldId)
    const original = currentField?.originalValue || currentField?.value

    // Optimistically update local UI state
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              value: editValue,
              isUserCorrected: true,
              originalValue: original,
            }
          : f
      )
    )
    setEditingId(null)

    // Sync correction to backend if real document
    if (documentId && documentId !== DEMO_DOCUMENT_ID) {
      try {
        await documentService.updateExtractedData(documentId, [
          { id: fieldId, value: editValue, unit: currentField?.unit },
        ])
        setSaveSuccessMsg('Correction saved to server.')
        setTimeout(() => setSaveSuccessMsg(null), 2500)
      } catch (err) {
        console.warn('Backend patch notice:', err.message)
      }
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'high':
        return <Badge variant="red">High</Badge>
      case 'low':
        return <Badge variant="yellow">Low</Badge>
      case 'normal':
        return <Badge variant="green">Normal</Badge>
      default:
        return <Badge variant="gray">Unspecified</Badge>
    }
  }

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="teal">{t('extracted.confidence_high')}</Badge>
      case 'medium':
        return <Badge variant="yellow">{t('extracted.confidence_medium')}</Badge>
      case 'low':
      default:
        return <Badge variant="red">{t('extracted.confidence_low')}</Badge>
    }
  }

  const getDocumentTypeLabel = (type) => {
    switch (type) {
      case 'prescription':
        return 'Printed Prescription'
      case 'discharge_instructions':
        return 'Discharge Instructions'
      case 'lab_report':
      default:
        return 'Laboratory Report'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <StepIndicator currentStep={3} language={language} />

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
          {t('extracted.title')}
        </h1>
        <p className="text-sm text-surface-500">
          {t('extracted.subtitle')}
        </p>
      </div>

      {saveSuccessMsg && (
        <Alert variant="success">
          <span>{saveSuccessMsg}</span>
        </Alert>
      )}

      {/* Demo Notice Banner - only in demo mode */}
      {isDemo && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-900 text-xs leading-relaxed">
          <FileCheck2 className="h-4 w-4 shrink-0 mt-0.5 text-teal-600" />
          <span>
            <strong>Demo Sample Review:</strong> {t('extracted.demo_notice')}
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <Card className="p-12 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-sm text-surface-600">{t('extracted.loading')}</p>
        </Card>
      ) : errorMessage ? (
        <Card className="p-8 text-center space-y-4 border-danger-200">
          <AlertTriangle className="h-8 w-8 text-danger-500 mx-auto" />
          <h3 className="text-base font-bold text-surface-900">Failed to Load Extracted Data</h3>
          <p className="text-sm text-surface-600">{errorMessage}</p>
          <div className="pt-2">
            <Link to="/upload">
              <Button variant="primary" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>{t('processing.btn_upload_diff')}</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : fields.length === 0 ? (
        <Card className="p-8 text-center space-y-4 border-amber-200 bg-amber-50/20">
          <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-surface-900">{t('extracted.empty_title')}</h3>
          <p className="text-xs sm:text-sm text-surface-600 max-w-md mx-auto">{t('extracted.empty_msg')}</p>
          <div className="pt-2">
            <Link to="/upload">
              <Button variant="primary" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>{t('processing.btn_upload_diff')}</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Document Meta Summary */}
          <Card className="p-5 flex flex-wrap items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-surface-900">
                  {isDemo
                    ? DEMO_EXTRACTED_DATA.documentName
                    : `Document ${effectiveDocId.slice(0, 8)}...`}
                </h2>
                <p className="text-xs text-surface-400">
                  ID: {effectiveDocId} · Verified with Zod Schema
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500">{t('extracted.doc_type')}:</span>
              <Badge variant="blue">{getDocumentTypeLabel(documentType)}</Badge>
            </div>
          </Card>

          {/* Extracted Fields Table */}
          <Card className="overflow-hidden">
            <Card.Header className="flex items-center justify-between bg-surface-50/70">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-surface-800">
                  {t('extracted.fields_heading')} ({fields.length})
                </h3>
              </div>
              <span className="text-xs text-surface-500 hidden sm:inline">
                {t('extracted.edit_hint')}
              </span>
            </Card.Header>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm divide-y divide-surface-100">
                <thead className="bg-surface-50 text-surface-500 font-medium">
                  <tr>
                    <th className="py-3 px-4">Parameter / Metric</th>
                    <th className="py-3 px-4">Extracted Value</th>
                    <th className="py-3 px-4">Reference Range</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Confidence & Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 bg-white">
                  {fields.map((field) => {
                    const isEditing = editingId === field.id
                    const displayName =
                      language === 'hi' && field.nameHi ? field.nameHi : field.key || field.name

                    return (
                      <tr key={field.id} className="hover:bg-surface-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-surface-900">
                          <div>
                            <span>{displayName}</span>
                            {field.isUserCorrected && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                                <Check className="h-2.5 w-2.5" /> Edited by user
                              </span>
                            )}
                            {language === 'hi' && field.name && (
                              <span className="block text-[11px] text-surface-400 font-normal">
                                {field.key || field.name}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-surface-800">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-24 px-2 py-1 text-xs border border-primary-400 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                autoFocus
                              />
                              <Button size="sm" variant="primary" onClick={() => handleSaveEdit(field.id)}>
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <button
                                onClick={() => handleStartEdit(field)}
                                className="group inline-flex items-center gap-1 text-surface-900 hover:text-primary-600 transition-colors"
                                title={t('extracted.edit_hint')}
                              >
                                <span>
                                  {field.value} {field.unit}
                                </span>
                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-surface-400" />
                              </button>
                              {field.isUserCorrected && field.originalValue && (
                                <div className="text-[10px] text-surface-400 font-normal">
                                  Original: {field.originalValue}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-surface-500">
                          {field.referenceRange ? `${field.referenceRange} ${field.unit || ''}` : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          {getStatusBadge(field.status)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div>{getConfidenceBadge(field.confidence)}</div>
                            <span className="text-[10px] text-surface-400 block">
                              {field.isUserCorrected ? 'Manual input' : 'Extracted verbatim'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Uncertainties Section */}
          {uncertainties.length > 0 && (
            <Card className="p-5 border-amber-200 bg-amber-50/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <h3>{t('extracted.uncertainties_heading')}</h3>
              </div>
              <p className="text-xs text-amber-900/80">
                {t('extracted.uncertainty_note')}
              </p>
              <ul className="space-y-2 pt-1">
                {uncertainties.map((unc, idx) => {
                  const text = typeof unc === 'string' ? unc : unc.reason || unc.field
                  return (
                    <li
                      key={idx}
                      className="text-xs bg-white/80 p-2.5 rounded-lg border border-amber-200/60 text-surface-700"
                    >
                      <strong className="text-surface-900">Uncertainty #{idx + 1}:</strong> {text}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {/* Navigation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            <Link to="/upload" className="w-full sm:w-auto">
              <Button variant="ghost" size="md" className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                <span>{t('common.back')}</span>
              </Button>
            </Link>

            <Button
              id="confirm-extracted-data-btn"
              size="lg"
              variant="primary"
              onClick={() => navigate(`/explanation/${effectiveDocId}`)}
              className="w-full sm:w-auto shadow-md"
            >
              <span>{t('extracted.confirm_btn')}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
