import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 text-surface-900 font-sans antialiased selection:bg-primary-500/20 selection:text-primary-900">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
