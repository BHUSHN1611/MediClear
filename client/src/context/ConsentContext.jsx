import { createContext, useContext, useState } from 'react'

const ConsentContext = createContext(null)

export function ConsentProvider({ children }) {
  // In Phase 1 (demo mode), consent is tracked in component state only.
  // Phase 2 will persist consent via the backend API and sessionId.
  const [hasConsented, setHasConsented] = useState(false)
  const [consentId, setConsentId] = useState(null)

  const giveConsent = (id = 'demo') => {
    setHasConsented(true)
    setConsentId(id)
  }

  const revokeConsent = () => {
    setHasConsented(false)
    setConsentId(null)
  }

  return (
    <ConsentContext.Provider value={{ hasConsented, consentId, giveConsent, revokeConsent }}>
      {children}
    </ConsentContext.Provider>
  )
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}
