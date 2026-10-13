import { Check } from 'lucide-react'
import { clsx } from 'clsx'

const STEPS = [
  { id: 'consent', labelEn: 'Consent', labelHi: 'सहमति' },
  { id: 'upload', labelEn: 'Upload', labelHi: 'अपलोड' },
  { id: 'review', labelEn: 'Review Data', labelHi: 'समीक्षा' },
  { id: 'explanation', labelEn: 'Explanation', labelHi: 'विवरण' },
]

export default function StepIndicator({ currentStep = 1, language = 'en', className }) {
  return (
    <nav aria-label="Progress" className={clsx('w-full py-4', className)}>
      <ol className="flex items-center justify-between max-w-xl mx-auto">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const label = language === 'hi' ? step.labelHi : step.labelEn

          return (
            <li key={step.id} className="flex-1 flex flex-col items-center relative">
              {/* Connector line behind steps */}
              {idx > 0 && (
                <div
                  className={clsx(
                    'absolute top-4 -left-1/2 right-1/2 h-0.5 -translate-y-1/2 z-0',
                    stepNum <= currentStep ? 'bg-primary-600' : 'bg-surface-200'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Circle node */}
              <div
                className={clsx(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200',
                  isCompleted && 'bg-primary-600 text-white shadow-sm',
                  isCurrent && 'bg-primary-50 text-primary-600 border-2 border-primary-600 shadow-sm',
                  !isCompleted && !isCurrent && 'bg-surface-100 text-surface-400 border border-surface-200'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={clsx(
                  'mt-2 text-xs font-medium text-center transition-colors',
                  isCurrent ? 'text-primary-700 font-semibold' : isCompleted ? 'text-surface-700' : 'text-surface-400'
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
