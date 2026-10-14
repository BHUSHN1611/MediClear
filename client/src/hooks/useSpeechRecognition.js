import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook for Browser Speech-to-Text (SpeechRecognition)
 * Supports English (en-IN) and Hindi (hi-IN).
 * Handles unsupported browsers, missing permissions, and transcription errors gracefully.
 */
export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    if (SpeechRecognition) {
      setIsSupported(true)
      const instance = new SpeechRecognition()
      instance.continuous = false
      instance.interimResults = true

      instance.onresult = (event) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        setTranscript(currentTranscript)
      }

      instance.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setPermissionDenied(true)
          setError('Microphone permission was denied.')
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try speaking again.')
        } else {
          setError(`Voice recognition error: ${event.error}`)
        }
        setIsListening(false)
      }

      instance.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = instance
    } else {
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore cleanup abort
        }
      }
    }
  }, [])

  const startListening = useCallback(
    ({ language = 'en' } = {}) => {
      if (!isSupported || !recognitionRef.current) {
        setError('Voice recognition is not supported in this browser.')
        return
      }

      setError(null)
      setTranscript('')
      setPermissionDenied(false)

      const targetLocale = language === 'hi' ? 'hi-IN' : 'en-IN'
      recognitionRef.current.lang = targetLocale

      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        // Recognition might already be running
        console.warn('[SpeechRecognition Start]', err.message)
      }
    },
    [isSupported]
  )

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    error,
    permissionDenied,
    startListening,
    stopListening,
    resetTranscript,
  }
}

export default useSpeechRecognition
