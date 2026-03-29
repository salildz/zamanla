import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/common/Button.jsx'
import Badge from '../components/common/Badge.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import { PageLoader } from '../components/common/LoadingSpinner.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import { useApiError } from '../hooks/useApiError.js'
import { useCurrentUser, useLogout } from '../hooks/useAuth.js'
import { useMySchedules } from '../hooks/useSession.js'
import { formatDateRange } from '../utils/slotUtils.js'

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 mb-3">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('dashboard.empty.title')}</h2>
      <p className="text-sm text-gray-500 mb-5">{t('dashboard.empty.subtitle')}</p>
      <Link to="/create">
        <Button variant="primary">{t('dashboard.empty.createButton')}</Button>
      </Link>
    </div>
  )
}

function LoginPrompt() {
  const { t } = useTranslation()
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.loginRequired.title')}</h1>
        <p className="text-sm text-gray-500 mb-5">{t('dashboard.loginRequired.subtitle')}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/auth?mode=login&next=%2Fmy%2Fschedules">
            <Button variant="primary">{t('dashboard.loginRequired.loginButton')}</Button>
          </Link>
          <Link to="/auth?mode=register&next=%2Fmy%2Fschedules">
            <Button variant="secondary">{t('dashboard.loginRequired.registerButton')}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function MySchedulesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const logoutMutation = useLogout()

  const {
    data: sessions,
    isLoading,
    isError,
    error,
    refetch,
  } = useMySchedules({ enabled: !!user })

  const errorMessage = useApiError(error)

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } finally {
      navigate('/')
    }
  }

  if (userLoading) {
    return <PageLoader message={t('dashboard.loadingUser')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-lg">Zamanla</span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-sm text-gray-500 hidden sm:inline">{t('dashboard.title')}</span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                loading={logoutMutation.isPending}
              >
                {t('auth.actions.logout')}
              </Button>
            )}
            <Link to="/create">
              <Button variant="primary" size="sm">{t('nav.newSession')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!user && <LoginPrompt />}

        {user && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t('dashboard.subtitle', { email: user.email })}
                </p>
              </div>
            </div>

            {isLoading && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-sm text-gray-500">{t('dashboard.loadingSchedules')}</div>
              </div>
            )}

            {isError && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <ErrorMessage
                  title={t('dashboard.loadErrorTitle')}
                  message={errorMessage}
                  onRetry={refetch}
                />
              </div>
            )}

            {!isLoading && !isError && sessions?.length === 0 && <EmptyState />}

            {!isLoading && !isError && sessions?.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {sessions.map((session) => (
                  <article key={session.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{session.title}</h2>
                          <Badge variant={session.isClosed ? 'danger' : 'success'} size="sm" dot>
                            {session.isClosed ? t('dashboard.status.closed') : t('dashboard.status.open')}
                          </Badge>
                        </div>

                        {session.description && (
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{session.description}</p>
                        )}

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                          <span>{formatDateRange(session.dateStart, session.dateEnd, session.timezone)}</span>
                          <span>{session.dayStartTime} - {session.dayEndTime}</span>
                          <span>{session.timezone}</span>
                          <span>{t('common.slotMinutes', { count: session.slotMinutes })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link to={`/s/${session.publicToken}`}>
                          <Button variant="secondary" size="sm">{t('dashboard.actions.openPublic')}</Button>
                        </Link>
                        <Link to={`/admin/${session.adminToken}`}>
                          <Button variant="primary" size="sm">{t('dashboard.actions.openAdmin')}</Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
