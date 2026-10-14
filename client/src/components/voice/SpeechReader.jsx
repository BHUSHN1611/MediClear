import { Volume2, Square, VolumeX } from 'lucide-react'
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis'
import Button from '../ui/Button'
import { useLanguage } from '../../context/LanguageContext'

/**
 * SpeechReader Component
 * Reads aloud provided text in either English or Hindi using the browser SpeechSynthesis.
 */
export default function SpeechReader({
  text = '',
  label = null,
  size = 'sm',
  variant = 'secondary',
  className = '',
}) {
  const { language } = useLanguage()
  const { isSupported, speaking, speak, cancel } = useSpeechSynthesis()

  if (!isSupported) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-surface-400 cursor-not-allowed">
        <VolumeX className="h-4 w-4" />
        <span>Audio not supported</span>
      </span>
    )
  }

  const handleToggle = () => {
    if (speaking) {
      cancel()
    } else {
      speak(text, language)
    }
  }

  const defaultLabel = speaking
    ? language === 'hi'
      ? 'रोकें'
      : 'Stop'
    : language === 'hi'
      ? 'सुनें (Listen)'
      : 'Listen'

  return (
    <Button
      size={size}
      variant={speaking ? 'danger' : variant}
      onClick={handleToggle}
      className={`transition-all duration-200 ${className}`}
      title={speaking ? 'Stop reading aloud' : 'Read aloud in current language'}
    >
      {speaking ? (
        <>
          <Square className="h-3.5 w-3.5 mr-1.5 fill-current animate-pulse" />
          <span>{label || defaultLabel}</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5 mr-1.5" />
          <span>{label || defaultLabel}</span>
        </>
      )}
    </Button>
  )
}
