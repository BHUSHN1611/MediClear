import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook for Browser Text-to-Speech (speechSynthesis)
 * Supports English (en-IN / en-US) and Hindi (hi-IN).
 */
export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [voices, setVoices] = useState([])
  const utteranceRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true)

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices()
        setVoices(available)
      }

      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices

      return () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
      }
    } else {
      setIsSupported(false)
    }
  }, [])

  const speak = useCallback(
    (text, language = 'en') => {
      if (!isSupported || !text) return

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const targetLocale = language === 'hi' ? 'hi-IN' : 'en-IN'
      utterance.lang = targetLocale

      // Try finding a matching language voice
      if (voices.length > 0) {
        const langPrefix = language === 'hi' ? 'hi' : 'en'
        const matchedVoice =
          voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(targetLocale.toLowerCase())) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix))

        if (matchedVoice) {
          utterance.voice = matchedVoice
        }
      }

      utterance.rate = 0.95 // Slightly slower for better patient comprehension
      utterance.pitch = 1.0

      utterance.onstart = () => {
        setSpeaking(true)
        setPaused(false)
      }

      utterance.onend = () => {
        setSpeaking(false)
        setPaused(false)
      }

      utterance.onerror = (event) => {
        // Interrupted is normal when user cancels or triggers another action
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('[SpeechSynthesis Error]', event.error)
        }
        setSpeaking(false)
        setPaused(false)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [isSupported, voices]
  )

  const pause = useCallback(() => {
    if (isSupported && speaking && !paused) {
      window.speechSynthesis.pause()
      setPaused(true)
    }
  }, [isSupported, speaking, paused])

  const resume = useCallback(() => {
    if (isSupported && paused) {
      window.speechSynthesis.resume()
      setPaused(false)
    }
  }, [isSupported, paused])

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      setPaused(false)
    }
  }, [isSupported])

  return {
    isSupported,
    speaking,
    paused,
    voices,
    speak,
    pause,
    resume,
    cancel,
  }
}

export default useSpeechSynthesis
