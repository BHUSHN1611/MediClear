import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, ShieldCheck } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-surface-200 bg-white mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded gradient-brand">
              <FileText className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <span className="font-semibold text-sm gradient-brand-text">MediClear</span>
          </div>

          {/* Disclaimer */}
          <div className="flex items-center gap-1.5 text-xs text-surface-400 text-center">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t('footer.disclaimer')}</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs text-surface-400">
            <Link to="/consent" className="hover:text-surface-600 transition-colors no-underline text-surface-400">
              {t('footer.privacy')}
            </Link>
            <Link to="/settings" className="hover:text-surface-600 transition-colors no-underline text-surface-400">
              {t('footer.settings')}
            </Link>
            <span>© {year}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
