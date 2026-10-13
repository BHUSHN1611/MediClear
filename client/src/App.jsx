import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'

import LandingPage from './pages/LandingPage'
import ConsentPage from './pages/ConsentPage'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import ExtractedDataPage from './pages/ExtractedDataPage'
import ExplanationPage from './pages/ExplanationPage'
import ChecklistPage from './pages/ChecklistPage'
import DoctorQuestionsPage from './pages/DoctorQuestionsPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/consent" element={<ConsentPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/processing/:documentId" element={<ProcessingPage />} />
        <Route path="/extracted/:documentId" element={<ExtractedDataPage />} />
        <Route path="/explanation/:documentId" element={<ExplanationPage />} />
        <Route path="/checklist/:documentId" element={<ChecklistPage />} />
        <Route path="/questions/:documentId" element={<DoctorQuestionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
