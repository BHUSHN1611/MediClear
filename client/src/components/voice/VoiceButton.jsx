import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { useLanguage } from '../../context/LanguageContext'
import Button from '../ui/Button'

/**
 * VoiceButton Component
 * Allows user to dictate queries or responses in English or Hindi.
 */
export default function VoiceButton({
  onTranscript = () => {},
  size = 'sm',
  className = '',
}) {
  const { language } = useLanguage()
  const {
    isSupported,
    isListening,
    transcript,
    error,
    permissionDenied,
    startListening,
    stopListening,
  } = useSpeechRecognition()

  const handleToggle = () => {
    if (isListening) {
      stopListening()
      if (transcript) onTranscript(transcript)
    } else {
      startListening({ language })
    }
  }

  if (!isSupported) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-surface-400 cursor-not-allowed"
        title="Speech recognition is not available in this browser. You can type queries instead."
      >
        <MicOff className="h-4 w-4" />
      </span>
    )
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <Button
        size={size}
        variant={isListening ? 'danger' : 'secondary'}
        onClick={handleToggle}
        className={`relative transition-all duration-200 ${className} ${
          isListening ? 'ring-2 ring-red-400 ring-offset-1 animate-pulse' : ''
        }`}
        title={
          isListening
            ? language === 'hi'
              ? 'बोलना समाप्त करें'
              : 'Stop listening'
            : language === 'hi'
              ? 'बोलकर पूछें (Hindi)'
              : 'Speak query (English)'
        }
      >
        <Mic className={`h-4 w-4 ${isListening ? 'text-white' : 'text-teal-600'}`} />
        <span className="text-xs">
          {isListening
            ? language === 'hi'
              ? 'सुन रहे हैं...'
              : 'Listening...'
            : language === 'hi'
              ? 'बोलें (Mic)'
              : 'Voice Input'}
        </span>
      </Button>

      {permissionDenied && (
        <span className="text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Mic access denied
        </span>
      )}

      {error && !permissionDenied && (
        <span className="text-[10px] text-surface-400">{error}</span>
      )}
    </div>
  )
}
