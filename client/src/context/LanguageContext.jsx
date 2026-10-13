import { createContext, useContext, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation()

  const language = i18n.language?.startsWith('hi') ? 'hi' : 'en'

  const setLanguage = useCallback(
    (lang) => {
      i18n.changeLanguage(lang)
      localStorage.setItem('mc_lang', lang)
    },
    [i18n]
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <div lang={language}>{children}</div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
