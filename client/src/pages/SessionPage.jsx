import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useSession, useResults } from '../hooks/useSession.js'
import {
  useParticipant,
  useJoinSession,
  getStoredEditToken,
  clearStoredEditToken,
} from '../hooks/useParticipant.js'
import { useCurrentUser } from '../hooks/useAuth.js'
import { generateSessionSlots } from '../utils/slotUtils.js'
import ParticipantEditor from '../components/availability/ParticipantEditor.jsx'
import ResultsHeatmap from '../components/results/ResultsHeatmap.jsx'
import BestTimesPanel from '../components/results/BestTimesPanel.jsx'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import { PageLoader, InlineLoader } from '../components/common/LoadingSpinner.jsx'
import ErrorMessage, { PageError } from '../components/common/ErrorMessage.jsx'
import Badge from '../components/common/Badge.jsx'
import TurnstileWidget, { isTurnstileEnabled } from '../components/common/TurnstileWidget.jsx'
import { ToastProvider } from '../components/common/Toast.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import ThemeSwitcher from '../components/common/ThemeSwitcher.jsx'
import { formatDateRange } from '../utils/slotUtils.js'
import { useJoinSessionSchema } from '../hooks/useSchemas.js'
import { getStoredProfileName, setStoredProfileName } from '../utils/profileNameStorage.js'

dayjs.extend(utc)
dayjs.extend(timezone)

function SessionHeader({ session }) {
  const { t } = useTranslation()
  const tz = session.timezone
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{session.title}</h1>
              {session.isClosed && (
                <Badge variant="danger" size="sm" dot>
                  <ClosedBadgeLabel />
                </Badge>
              )}
            </div>
            {session.description && (
              <p className="text-sm text-gray-500 mb-2">{session.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDateRange(session.dateStart, session.dateEnd, tz)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {session.dayStartTime} – {session.dayEndTime}
                <span className="text-gray-400">({t('common.slotMinutes', { count: session.slotMinutes })})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
                </svg>
                {tz}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClosedBadgeLabel() {
  const { t } = useTranslation()
  return t('session.closed')
}

function JoinForm({ publicToken, session, onJoin }) {
  const { t } = useTranslation()
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [rememberedName, setRememberedName] = useState('')
  const [isEditingRememberedName, setIsEditingRememberedName] = useState(true)
  const [saveNoticeVisible, setSaveNoticeVisible] = useState(false)
  const { data: currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? null
  const joinMutation = useJoinSession(publicToken)
  const joinSchema = useJoinSessionSchema()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      name: '',
    },
  })

  const watchedName = watch('name')
  const normalizedName = typeof watchedName === 'string' ? watchedName.trim() : ''
  const showNameInput = !userId || isEditingRememberedName || !rememberedName

  useEffect(() => {
    if (!userId) {
      setRememberedName('')
      setIsEditingRememberedName(true)
      return
    }

    const storedName = getStoredProfileName(userId)
    setRememberedName(storedName)

    if (storedName) {
      setValue('name', storedName, { shouldDirty: false, shouldValidate: true })
      setIsEditingRememberedName(false)
      return
    }

    setValue('name', '', { shouldDirty: false, shouldValidate: false })
    setIsEditingRememberedName(true)
  }, [userId, setValue])

  useEffect(() => {
    if (!saveNoticeVisible) return undefined

    const timeoutId = window.setTimeout(() => {
      setSaveNoticeVisible(false)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [saveNoticeVisible])

  const handleSaveRememberedName = () => {
    if (!userId || !normalizedName) return

    setStoredProfileName(userId, normalizedName)
    setRememberedName(normalizedName)
    setIsEditingRememberedName(false)
    setSaveNoticeVisible(true)
  }

  const onSubmit = (values) => {
    if (isTurnstileEnabled() && !turnstileToken) return

    const submittedName = values.name.trim()

    joinMutation.mutate(
      {
        name: submittedName,
        ...(isTurnstileEnabled() && turnstileToken ? { cfTurnstileResponse: turnstileToken } : {}),
      },
      {
        // Per-call onSuccess: notify the parent so it can update editToken state
        onSuccess: (participant) => {
          if (userId && submittedName) {
            setStoredProfileName(userId, submittedName)
            setRememberedName(submittedName)
            setIsEditingRememberedName(false)
          }

          onJoin?.(participant.editToken)
        },
      }
    )
  }

  if (session.isClosed) {
    return (
      <div className="text-center py-10 reveal-up">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">{t('session.sessionClosed.title')}</h3>
        <p className="text-sm text-gray-400">{t('session.sessionClosed.message')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto py-6 sm:py-10 px-4 sm:px-0">
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm reveal-up" style={{ '--reveal-delay': '40ms' }}>
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-full mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t('session.join.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('session.join.subtitle', { title: session.title })}
          </p>
          {currentUser?.email && (
            <p className="text-xs text-gray-500 mt-2 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-left">
              {t('session.join.authHint', { email: currentUser.email })}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {currentUser && rememberedName && !isEditingRememberedName && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-700 truncate">
                {t('session.join.rememberedAs', { name: rememberedName })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsEditingRememberedName(true)
                  setValue('name', rememberedName, { shouldDirty: false, shouldValidate: true })
                }}
                className="shrink-0 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
              >
                {t('session.join.editRememberedName')}
              </button>
            </div>
          )}

          {showNameInput ? (
            <Input
              label={t('session.join.nameLabel')}
              required
              placeholder={t('session.join.namePlaceholder')}
              error={errors.name?.message}
              autoFocus
              {...register('name')}
            />
          ) : (
            <input type="hidden" {...register('name')} />
          )}

          {currentUser && showNameInput && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={handleSaveRememberedName}
                disabled={!normalizedName}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {t('session.join.saveRememberedName')}
              </button>
            </div>
          )}

          {saveNoticeVisible && (
            <p className="text-xs text-emerald-700 -mt-2">{t('session.join.saveSuccess')}</p>
          )}

          {isTurnstileEnabled() && (
            <TurnstileWidget
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
          )}

          {joinMutation.isError && (
            <ErrorMessage
              message={joinMutation.error?.userMessage || t('session.join.errorGeneric')}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={joinMutation.isPending}
            disabled={isTurnstileEnabled() && !turnstileToken}
          >
            {joinMutation.isPending ? t('session.join.submittingButton') : t('session.join.submitButton')}
          </Button>
        </form>
      </div>
    </div>
  )
}

function MyAvailabilityTab({ session, publicToken }) {
  const { t } = useTranslation()
  // editToken must be reactive state — plain getStoredEditToken() is not reactive
  // and would never trigger a re-render after a successful join
  const [editToken, setEditToken] = useState(() => getStoredEditToken(publicToken))

  const { data: participant, isLoading, isError, error, refetch } = useParticipant(
    publicToken,
    editToken
  )

  const is404 = isError && error?.response?.status === 404

  // Clear invalid token reactively (side-effect, not during render)
  useEffect(() => {
    if (is404 && editToken) {
      clearStoredEditToken(publicToken)
      setEditToken(null)
    }
  }, [is404, editToken, publicToken])

  // No token (first visit, or just cleared an invalid one)
  if (!editToken || is404) {
    return <JoinForm publicToken={publicToken} session={session} onJoin={setEditToken} />
  }

  if (isLoading) {
    return <InlineLoader message={t('session.loading.availability')} />
  }

  if (isError) {
    return (
      <div className="py-8">
        <ErrorMessage
          title={t('session.errors.availabilityTitle')}
          message={error?.userMessage}
          onRetry={refetch}
        />
      </div>
    )
  }

  if (!participant) return null

  return (
    <ParticipantEditor
      session={session}
      participant={participant}
      publicToken={publicToken}
    />
  )
}

function BestTimeBanner({ results, session }) {
  const { t } = useTranslation()
  if (!results || results.length === 0) return null

  const sorted = [...results].sort((a, b) => b.availableCount - a.availableCount)
  const top = sorted[0]
  if (!top || top.availableCount === 0) return null

  const tz = session?.timezone || 'UTC'
  const time = dayjs(top.slotStart).tz(tz).format('ddd, D MMM · HH:mm')
  const pct = top.totalParticipants > 0
    ? Math.round((top.availableCount / top.totalParticipants) * 100)
    : 0

  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
        1
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-emerald-800 truncate">{time}</p>
        <p className="text-xs text-emerald-600">
          {t('admin.overview.availableSlots', { count: top.availableCount })}
          {' · '}{pct}%
        </p>
      </div>
      <span className="shrink-0 text-xs text-emerald-700 font-semibold">{t('results.bestTimes.title')}</span>
    </div>
  )
}

function GroupResultsTab({ session, publicToken }) {
  const { t } = useTranslation()
  const [highlightedSlot, setHighlightedSlot] = useState(null)
  const allSlots = generateSessionSlots(session)

  const { data: results, isLoading, isError, error, refetch } = useResults(publicToken, {
    refetchInterval: 30000,
  })

  const highlightedSlots = highlightedSlot ? new Set([highlightedSlot]) : null

  if (isLoading) {
    return <InlineLoader message={t('session.loading.results')} />
  }

  if (isError) {
    return (
      <div className="py-8">
        <ErrorMessage
          title={t('session.errors.resultsTitle')}
          message={error?.userMessage}
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div>
      <BestTimeBanner results={results || []} session={session} />
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <ResultsHeatmap
            session={session}
            slots={allSlots}
            results={results || []}
            highlightedSlots={highlightedSlots}
          />
        </div>
        <div className="lg:w-64 xl:w-72 shrink-0">
          <BestTimesPanel
            results={results || []}
            session={session}
            onHighlight={setHighlightedSlot}
            highlightedSlots={highlightedSlots}
          />
        </div>
      </div>
    </div>
  )
}

export default function SessionPage() {
  const { t } = useTranslation()
  const { publicToken } = useParams()
  const [activeTab, setActiveTab] = useState('availability')
  const tabItems = [
    {
      id: 'availability',
      label: t('session.tabs.myAvailability'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'results',
      label: t('session.tabs.groupResults'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z" />
        </svg>
      ),
    },
  ]

  const { data: session, isLoading, isError, error, refetch } = useSession(publicToken)

  if (isLoading) {
    return <PageLoader message={t('session.loading.session')} />
  }

  if (isError) {
    const is404 = error?.response?.status === 404
    return (
      <PageError
        title={is404 ? t('session.errors.sessionNotFound') : t('session.errors.sessionLoadError')}
        message={
          is404
            ? t('session.errors.sessionNotFoundMessage')
            : error?.userMessage
        }
        onRetry={is404 ? undefined : refetch}
      />
    )
  }

  if (!session) return null

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Nav */}
        <nav className="border-b border-gray-100 bg-white/85 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-lg">Zamanla</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeSwitcher compact />
              <LanguageSwitcher />
            </div>
          </div>
        </nav>

        {/* Session header */}
        <SessionHeader session={session} />

        {/* Tabs */}
        <div className="tab-rail sticky top-14 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-2 py-1">
              {tabItems.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : 'tab-button-inactive'}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {activeTab === 'availability' && (
            <MyAvailabilityTab session={session} publicToken={publicToken} />
          )}
          {activeTab === 'results' && (
            <GroupResultsTab session={session} publicToken={publicToken} />
          )}
        </div>
      </div>
    </ToastProvider>
  )
}
