import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Core styles and i18n initialization
import './index.css'
import './i18n'

// Context Providers
import { LanguageProvider } from './context/LanguageContext'
import { ConsentProvider } from './context/ConsentContext'

// Root App Component
import App from './App'
import Spinner from './components/ui/Spinner'

function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-medium text-surface-500">Loading MediClear…</p>
      </div>
    </div>
  )
}

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Suspense fallback={<RootLoading />}>
        <LanguageProvider>
          <ConsentProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ConsentProvider>
        </LanguageProvider>
      </Suspense>
    </StrictMode>
  )
}
