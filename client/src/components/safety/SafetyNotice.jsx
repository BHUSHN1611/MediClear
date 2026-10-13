import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'

/**
 * SafetyNotice — prominent medical safety disclaimer banner.
 * Always visible when AI-generated content is shown.
 */
export default function SafetyNotice({ className, children }) {
  const { t } = useTranslation()

  return (
    <div className={clsx('safety-notice', className)} role="note" aria-label="Medical safety notice">
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
      <div className="space-y-1">
        {children ?? (
          <>
            <p className="font-semibold text-amber-800">{t('safety.not_a_doctor')}</p>
            <p>{t('safety.consult_professional')}</p>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * EmergencyNotice — urgent notice shown when potential emergency detected.
 */
export function EmergencyNotice({ className }) {
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        'flex gap-3 rounded-xl p-4 bg-danger-50 border border-danger-500/40 text-danger-800 text-sm font-medium',
        className
      )}
      role="alert"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <p>{t('safety.emergency')}</p>
    </div>
  )
}
