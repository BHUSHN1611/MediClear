import { useTranslation } from 'react-i18next'
import { Languages, ShieldCheck, Database, Cpu, Info, Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-surface-500">
          Configure interface preferences and review system privacy settings.
        </p>
      </div>

      {/* Language Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-surface-100 pb-3">
          <Languages className="h-5 w-5 text-primary-600" />
          <h2 className="text-base font-bold text-surface-900">
            {t('settings.language_heading')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setLanguage('en')}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
              language === 'en'
                ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                : 'border-surface-200 hover:border-surface-300 bg-white'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-surface-900">English</p>
              <p className="text-xs text-surface-500">Standard English interface</p>
            </div>
            {language === 'en' && <Check className="h-5 w-5 text-primary-600" />}
          </button>

          <button
            onClick={() => setLanguage('hi')}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
              language === 'hi'
                ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                : 'border-surface-200 hover:border-surface-300 bg-white'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-surface-900 font-hindi">हिन्दी (Hindi)</p>
              <p className="text-xs text-surface-500 font-hindi">देवनागरी लिपि में संपूर्ण इंटरफ़ेस</p>
            </div>
            {language === 'hi' && <Check className="h-5 w-5 text-primary-600" />}
          </button>
        </div>
      </Card>

      {/* Data Retention & Privacy */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2.5 border-b border-surface-100 pb-3">
          <Database className="h-5 w-5 text-teal-600" />
          <h2 className="text-base font-bold text-surface-900">
            {t('settings.data_heading')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
          {t('settings.data_body')}
        </p>
      </Card>

      {/* AI Processing Disclosure */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2.5 border-b border-surface-100 pb-3">
          <Cpu className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-surface-900">
            {t('settings.ai_provider_heading')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
          {t('settings.ai_provider_body')}
        </p>
      </Card>

      {/* Medical Disclaimer */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2.5 border-b border-surface-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-surface-900">
            {t('settings.disclaimer_heading')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
          {t('settings.disclaimer_body')}
        </p>
      </Card>

      {/* Version Tag */}
      <div className="text-center pt-2">
        <Badge variant="gray">{t('settings.version')}</Badge>
      </div>
    </div>
  )
}
