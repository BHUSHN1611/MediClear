import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Languages, Settings, FileText } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function Header() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const location = useLocation()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en')
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-surface-200 shadow-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group no-underline"
            aria-label="MediClear — home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand shadow-card">
              <FileText className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold gradient-brand-text">MediClear</span>
          </Link>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              id="header-language-toggle"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-800 transition-colors"
              aria-label={t('nav.language')}
              title={language === 'en' ? 'Switch to Hindi' : 'Switch to English'}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {language === 'en' ? 'हिन्दी' : 'English'}
              </span>
            </button>

            {/* Settings */}
            <Link
              to="/settings"
              id="header-settings-link"
              className={`flex items-center justify-center h-9 w-9 rounded-lg transition-colors no-underline ${
                location.pathname === '/settings'
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800'
              }`}
              aria-label={t('nav.settings')}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
