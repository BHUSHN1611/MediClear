import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, CheckSquare } from 'lucide-react'
import { useConsent } from '../context/ConsentContext'
import { useLanguage } from '../context/LanguageContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import StepIndicator from '../components/common/StepIndicator'
import { EmergencyNotice } from '../components/safety/SafetyNotice'

export default function ConsentPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { hasConsented, giveConsent } = useConsent()
  const navigate = useNavigate()

  const [agreed, setAgreed] = useState(hasConsented)
  const [error, setError] = useState(false)

  const handleContinue = (e) => {
    e.preventDefault()
    if (!agreed) {
      setError(true)
      return
    }
    giveConsent('consent-session-001')
    navigate('/upload')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepIndicator currentStep={1} language={language} />

      <div className="space-y-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
          {t('consent.title')}
        </h1>
        <p className="text-sm text-surface-500">
          {t('consent.subtitle')}
        </p>
      </div>

      <EmergencyNotice />

      <Card className="divide-y divide-surface-100">
        {/* Section 1: Data retention */}
        <div className="p-6 space-y-2">
          <div className="flex items-center gap-2 text-primary-700 font-semibold text-sm">
            <ShieldCheck className="h-4 w-4" />
            <h3>{t('consent.privacy_heading')}</h3>
          </div>
          <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
            {t('consent.privacy_body')}
          </p>
        </div>

        {/* Section 2: AI Processing */}
        <div className="p-6 space-y-2">
          <div className="flex items-center gap-2 text-primary-700 font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <h3>{t('consent.ai_heading')}</h3>
          </div>
          <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
            {t('consent.ai_body')}
          </p>
        </div>

        {/* Section 3: Limitations */}
        <div className="p-6 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <h3>{t('consent.limitation_heading')}</h3>
          </div>
          <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
            {t('consent.limitation_body')}
          </p>
        </div>

        {/* Form controls */}
        <div className="p-6 bg-surface-50/60 space-y-5">
          {error && (
            <Alert variant="danger">
              <span>{t('consent.checkbox_required')}</span>
            </Alert>
          )}

          <label
            htmlFor="consent-checkbox"
            className="flex items-start gap-3 cursor-pointer select-none group"
          >
            <input
              id="consent-checkbox"
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                if (e.target.checked) setError(false)
              }}
              className="mt-1 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium text-surface-800 group-hover:text-surface-900 leading-relaxed">
              {t('consent.checkbox_label')}
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-surface-400 order-2 sm:order-1">
              {t('consent.version')}
            </span>

            <Button
              id="consent-submit-btn"
              size="lg"
              onClick={handleContinue}
              className="w-full sm:w-auto order-1 sm:order-2 shadow-sm"
            >
              <span>{t('consent.accept_btn')}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
