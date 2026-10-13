import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Sparkles,
  CheckSquare,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SafetyNotice from '../components/safety/SafetyNotice'
import { DEMO_DOCUMENT_ID } from '../data/mockData'

export default function LandingPage() {
  const { t } = useTranslation()

  const features = [
    {
      icon: FileText,
      color: 'bg-primary-50 text-primary-600',
      title: t('landing.feature_extract'),
      desc: t('landing.feature_extract_desc'),
    },
    {
      icon: Sparkles,
      color: 'bg-teal-50 text-teal-600',
      title: t('landing.feature_explain'),
      desc: t('landing.feature_explain_desc'),
    },
    {
      icon: CheckSquare,
      color: 'bg-amber-50 text-amber-600',
      title: t('landing.feature_checklist'),
      desc: t('landing.feature_checklist_desc'),
    },
    {
      icon: HelpCircle,
      color: 'bg-indigo-50 text-indigo-600',
      title: t('landing.feature_questions'),
      desc: t('landing.feature_questions_desc'),
    },
  ]

  const steps = [
    { num: '1', title: t('landing.step1_title'), desc: t('landing.step1_desc') },
    { num: '2', title: t('landing.step2_title'), desc: t('landing.step2_desc') },
    { num: '3', title: t('landing.step3_title'), desc: t('landing.step3_desc') },
    { num: '4', title: t('landing.step4_title'), desc: t('landing.step4_desc') },
  ]

  return (
    <div className="space-y-16 py-4 sm:py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200/60 text-primary-700 text-xs font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5 text-primary-600" />
          <span>Bilingual Health Literacy Assistant · English & हिन्दी</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-surface-900 tracking-tight leading-tight">
          {t('landing.hero_title')}
        </h1>

        <p className="text-lg sm:text-xl text-surface-600 leading-relaxed max-w-2xl mx-auto">
          {t('landing.hero_subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/consent">
            <Button size="lg" className="w-full sm:w-auto shadow-md">
              <span>{t('landing.cta_primary')}</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>

          <Link to={`/explanation/${DEMO_DOCUMENT_ID}`}>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              <span>View Sample Demo Report</span>
            </Button>
          </Link>
        </div>

        {/* Supported Types Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-surface-500">
          <span className="font-medium text-surface-700">{t('landing.supported_types')}:</span>
          <Badge variant="blue">{t('landing.type_lab')}</Badge>
          <Badge variant="teal">{t('landing.type_prescription')}</Badge>
          <Badge variant="green">{t('landing.type_discharge')}</Badge>
          <Badge variant="gray">{t('landing.type_formats')}</Badge>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="max-w-3xl mx-auto">
        <SafetyNotice>
          <p className="font-semibold text-amber-900 text-sm">
            {t('landing.disclaimer')}
          </p>
        </SafetyNotice>
      </section>

      {/* Features Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-surface-900">
            Clear, Reliable Insights for Patients & Families
          </h2>
          <p className="text-sm text-surface-600 max-w-xl mx-auto">
            Designed for patient comprehension with strict clinical boundaries and no synthetic diagnoses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <Card key={idx} className="p-5 flex flex-col justify-between hover:shadow-card-md transition-shadow">
                <div className="space-y-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${feat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-surface-900 text-base">{feat.title}</h3>
                  <p className="text-xs text-surface-600 leading-relaxed">{feat.desc}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white rounded-3xl border border-surface-200 p-8 sm:p-10 shadow-card space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-surface-900">
            {t('landing.how_works_title')}
          </h2>
          <p className="text-sm text-surface-500">
            Four simple steps designed to respect your privacy and clinical context.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div key={st.num} className="relative space-y-2 pl-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                  {st.num}
                </span>
                <h4 className="font-semibold text-surface-900 text-sm">{st.title}</h4>
              </div>
              <p className="text-xs text-surface-500 pl-9 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center pt-4 border-t border-surface-100">
          <Link to="/consent">
            <Button size="md" variant="primary">
              <UploadCloud className="h-4 w-4 mr-1.5" />
              <span>{t('landing.cta_primary')}</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
