/**
 * Voice Provider Interface
 * 
 * Abstract provider architecture designed to decouple UI components from specific speech backends.
 * Currently backed by browser Web Speech API (SpeechSynthesis & SpeechRecognition).
 * Designed for plug-and-play extension with Bhashini or other cloud providers without UI refactoring.
 */

class WebSpeechProvider {
  constructor() {
    this.hasSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window
    this.hasRecognition =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  }

  isSynthesisSupported() {
    return this.hasSynthesis
  }

  isRecognitionSupported() {
    return this.hasRecognition
  }

  getSynthesisLang(lang = 'en') {
    return lang === 'hi' ? 'hi-IN' : 'en-IN'
  }

  getRecognitionLang(lang = 'en') {
    return lang === 'hi' ? 'hi-IN' : 'en-IN'
  }
}

export const voiceProvider = new WebSpeechProvider()
export default voiceProvider
