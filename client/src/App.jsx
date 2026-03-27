import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n/index.js'
import HomePage from './pages/HomePage.jsx'
import CreateSessionPage from './pages/CreateSessionPage.jsx'
import SessionPage from './pages/SessionPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateSessionPage />} />
          <Route path="/s/:publicToken" element={<SessionPage />} />
          <Route path="/admin/:adminToken" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </I18nextProvider>
  )
}
