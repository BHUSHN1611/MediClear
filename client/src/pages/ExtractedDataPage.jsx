import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Edit2,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import StepIndicator from '../components/common/StepIndicator'
import { DEMO_DOCUMENT_ID, DEMO_EXTRACTED_DATA } from '../data/mockData'

export default function ExtractedDataPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { documentId = DEMO_DOCUMENT_ID } = useParams()
  const navigate = useNavigate()

  // Initialize editable fields with synthetic data
  const [fields, setFields] = useState(DEMO_EXTRACTED_DATA.fields)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleStartEdit = (field) => {
    setEditingId(field.id)
    setEditValue(field.value)
  }

  const handleSaveEdit = (fieldId) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value: editValue } : f))
    )
    setEditingId(null)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'high':
        return <Badge variant="red">High</Badge>
      case 'low':
        return <Badge variant="yellow">Low</Badge>
      case 'normal':
      default:
        return <Badge variant="green">Normal</Badge>
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

      {/* Demo mode alert banner */}
      <Alert variant="info" title="Phase 1 Demo Mode">
        <p className="text-xs sm:text-sm">
          {t('extracted.demo_notice')}
        </p>
      </Alert>

      {/* Document Meta Summary */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-900">
              {DEMO_EXTRACTED_DATA.documentName}
            </h2>
            <p className="text-xs text-surface-400">
              ID: {documentId} · Sample Specimen Date: {DEMO_EXTRACTED_DATA.patientInfo.specimenDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">{t('extracted.doc_type')}:</span>
          <Badge variant="blue">Lab Report (Lipid & Metabolic)</Badge>
        </div>
      </Card>

      {/* Extracted Fields Table */}
      <Card className="overflow-hidden">
        <Card.Header className="flex items-center justify-between bg-surface-50/70">
          <h3 className="font-semibold text-sm text-surface-800">
            {t('extracted.fields_heading')}
          </h3>
          <span className="text-xs text-surface-500 hidden sm:inline">
            {t('extracted.edit_hint')}
          </span>
        </Card.Header>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm divide-y divide-surface-100">
            <thead className="bg-surface-50 text-surface-500 font-medium">
              <tr>
                <th className="py-3 px-4">Test / Biomarker</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Reference Range</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-white">
              {fields.map((field) => {
                const isEditing = editingId === field.id
                const displayName = language === 'hi' && field.nameHi ? field.nameHi : field.name

                return (
                  <tr key={field.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-surface-900">
                      <div>
                        <span>{displayName}</span>
                        {language === 'hi' && (
                          <span className="block text-[11px] text-surface-400 font-normal">
                            {field.name}
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
                            className="w-20 px-2 py-1 text-xs border border-primary-400 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                          />
                          <Button size="sm" variant="primary" onClick={() => handleSaveEdit(field.id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(field)}
                          className="group inline-flex items-center gap-1 text-surface-900 hover:text-primary-600 transition-colors"
                          title={t('extracted.edit_hint')}
                        >
                          <span>{field.value} {field.unit}</span>
                          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-surface-400" />
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-surface-500">
                      {field.referenceRange} {field.unit}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(field.status)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getConfidenceBadge(field.confidence)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Uncertainties Section */}
      {DEMO_EXTRACTED_DATA.uncertainties.length > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <h3>{t('extracted.uncertainties_heading')}</h3>
          </div>
          <p className="text-xs text-amber-900/80">
            {t('extracted.uncertainty_note')}
          </p>
          <ul className="space-y-2 pt-1">
            {DEMO_EXTRACTED_DATA.uncertainties.map((unc) => (
              <li
                key={unc.id}
                className="text-xs bg-white/80 p-2.5 rounded-lg border border-amber-200/60 text-surface-700"
              >
                <strong className="text-surface-900">
                  {language === 'hi' ? unc.fieldHi : unc.field}:
                </strong>{' '}
                <span>{language === 'hi' ? unc.reasonHi : unc.reason}</span>
              </li>
            ))}
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
          onClick={() => navigate(`/explanation/${documentId}`)}
          className="w-full sm:w-auto shadow-md"
        >
          <span>{t('extracted.confirm_btn')}</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}
