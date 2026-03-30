import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n/index.js'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const CreateSessionPage = lazy(() => import('./pages/CreateSessionPage.jsx'))
const SessionPage = lazy(() => import('./pages/SessionPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'))
const MySchedulesPage = lazy(() => import('./pages/MySchedulesPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense
          fallback={(
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          )}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateSessionPage />} />
            <Route path="/s/:publicToken" element={<SessionPage />} />
            <Route path="/admin/:adminToken" element={<AdminPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/my/schedules" element={<MySchedulesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </I18nextProvider>
  )
}
