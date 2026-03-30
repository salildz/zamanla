import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  useAdminSession,
  useUpdateSession,
  useDeleteSession,
  useCloseSession,
  useClaimSession,
  useResults,
} from '../hooks/useSession.js'
import { useCurrentUser } from '../hooks/useAuth.js'
import { exportSession } from '../services/api.js'
import { generateSessionSlots, formatDateRange } from '../utils/slotUtils.js'
import ResultsHeatmap from '../components/results/ResultsHeatmap.jsx'
import BestTimesPanel from '../components/results/BestTimesPanel.jsx'
import Button from '../components/common/Button.jsx'
import Badge from '../components/common/Badge.jsx'
import { PageLoader, InlineLoader } from '../components/common/LoadingSpinner.jsx'
import ErrorMessage, { PageError } from '../components/common/ErrorMessage.jsx'
import { ToastProvider, useToast } from '../components/common/Toast.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import ThemeSwitcher from '../components/common/ThemeSwitcher.jsx'

dayjs.extend(utc)
dayjs.extend(timezone)

function CopyButton({ text, label, className }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-xs font-medium transition-colors px-2 py-1 rounded ${
        copied
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
      } ${className || ''}`}
    >
      {copied ? t('common.copied') : (label || t('common.copy'))}
    </button>
  )
}

function InlineEditField({ value, onSave, label, multiline = false }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleSave = () => {
    if (draft.trim() !== value) {
      onSave(draft.trim())
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setDraft(value || '')
      setEditing(false)
    }
    if (e.key === 'Enter' && !multiline) {
      handleSave()
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full rounded-md border border-indigo-400 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-indigo-400 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-medium px-3 py-1.5 rounded-md"
          >
            {t('common.save')}
          </button>
          <button
            onClick={() => {
              setDraft(value || '')
              setEditing(false)
            }}
            className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2">
      <span className={multiline ? 'text-sm text-gray-600 whitespace-pre-wrap' : ''}>
        {value || <span className="text-gray-400 italic">{t('common.none')}</span>}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 opacity-0 group-hover:opacity-100 touch-device:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 mt-0.5"
        title={t('common.edit')}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-slide-up">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

function AdminContent({ session, adminToken }) {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [highlightedSlot, setHighlightedSlot] = useState(null)
  const autoClaimTriggeredRef = useRef(false)

  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser()

  const updateMutation = useUpdateSession(adminToken)
  const closeMutation = useCloseSession(adminToken)
  const deleteMutation = useDeleteSession(adminToken)
  const claimMutation = useClaimSession(adminToken)

  const { data: results, isLoading: resultsLoading } = useResults(session.publicToken, {
    refetchInterval: 30000,
  })

  const allSlots = generateSessionSlots(session)
  const tz = session.timezone
  const baseUrl = window.location.origin
  const publicUrl = `${baseUrl}/s/${session.publicToken}`
  const adminUrl = `${baseUrl}/admin/${adminToken}`
  const claimReturnPath = `/admin/${adminToken}?autoclaim=1`
  const claimLoginPath = `/auth?mode=login&next=${encodeURIComponent(claimReturnPath)}`
  const claimRegisterPath = `/auth?mode=register&next=${encodeURIComponent(claimReturnPath)}`
  const isAutoclaimRequested = searchParams.get('autoclaim') === '1'

  const claimStatus = useMemo(() => {
    const ownerId = session.ownerId == null ? null : Number(session.ownerId)
    const currentUserId = currentUser?.id == null ? null : Number(currentUser.id)

    if (!currentUser) return 'anonymous'
    if (!ownerId) return 'claimable'
    if (ownerId === currentUserId) return 'ownedByCurrentUser'
    return 'ownedByAnotherUser'
  }, [currentUser, session.ownerId])

  const clearAutoclaimParam = () => {
    if (!isAutoclaimRequested) return
    const params = new URLSearchParams(searchParams)
    params.delete('autoclaim')
    setSearchParams(params, { replace: true })
  }

  const handleUpdateTitle = async (title) => {
    try {
      await updateMutation.mutateAsync({ title })
      toast.success(t('admin.toast.titleUpdated'))
    } catch (err) {
      toast.error(err.userMessage || t('admin.toast.titleUpdateFailed'))
    }
  }

  const handleUpdateDescription = async (description) => {
    try {
      await updateMutation.mutateAsync({ description })
      toast.success(t('admin.toast.descriptionUpdated'))
    } catch (err) {
      toast.error(err.userMessage || t('admin.toast.descriptionUpdateFailed'))
    }
  }

  const handleCloseSession = async () => {
    setConfirmDialog(null)
    try {
      await closeMutation.mutateAsync()
      toast.success(t('admin.toast.sessionClosed'))
    } catch (err) {
      toast.error(err.userMessage || t('admin.toast.sessionCloseFailed'))
    }
  }

  const handleDeleteSession = async () => {
    setConfirmDialog(null)
    try {
      await deleteMutation.mutateAsync()
      toast.success(t('admin.toast.sessionDeleted'))
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      toast.error(err.userMessage || t('admin.toast.sessionDeleteFailed'))
    }
  }

  const handleClaimSession = async () => {
    try {
      await claimMutation.mutateAsync()
      toast.success(t('admin.toast.sessionClaimed'))
      clearAutoclaimParam()
    } catch (err) {
      toast.error(err.userMessage || t('admin.toast.sessionClaimFailed'))
      clearAutoclaimParam()
    }
  }

  const handleExport = async (format) => {
    try {
      const data = await exportSession(adminToken, format)
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `zamanla-export-${session.publicToken}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `zamanla-export-${session.publicToken}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      toast.success(format === 'csv' ? t('admin.toast.exportedCsv') : t('admin.toast.exportedJson'))
    } catch (err) {
      toast.error(err.userMessage || t('admin.toast.exportFailed'))
    }
  }

  // Derive participant list from results (session API doesn't include participants)
  const participants = useMemo(() => {
    if (!results || results.length === 0) return []
    const map = new Map()
    for (const slot of results) {
      for (const p of slot.participants || []) {
        if (!map.has(p.id)) {
          map.set(p.id, { id: p.id, name: p.name, availableCount: 0 })
        }
        map.get(p.id).availableCount++
      }
    }
    return Array.from(map.values()).sort((a, b) => b.availableCount - a.availableCount)
  }, [results])

  const highlightedSlots = highlightedSlot ? new Set([highlightedSlot]) : null

  useEffect(() => {
    autoClaimTriggeredRef.current = false
  }, [adminToken])

  useEffect(() => {
    if (!isAutoclaimRequested) return
    if (currentUserLoading) return
    if (!currentUser) return
    if (autoClaimTriggeredRef.current) return

    autoClaimTriggeredRef.current = true

    if (claimStatus === 'ownedByCurrentUser' || claimStatus === 'ownedByAnotherUser') {
      clearAutoclaimParam()
      return
    }

    handleClaimSession()
  }, [
    claimStatus,
    currentUser,
    currentUserLoading,
    isAutoclaimRequested,
  ])

  const tabs = [
    {
      id: 'overview',
      label: t('admin.tabs.overview'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm10 8h8v-6h-8v6zm0-8h8V3h-8v10zM3 21h8v-6H3v6z" />
        </svg>
      ),
    },
    {
      id: 'results',
      label: t('admin.tabs.results'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7 3h4v11h-4V10z" />
        </svg>
      ),
    },
    {
      id: 'links',
      label: t('admin.tabs.share'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.5-1.5m-1.672-3.328a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.5 1.5" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirm dialogs */}
      {confirmDialog === 'close' && (
        <ConfirmDialog
          title={t('admin.dialogs.closeTitle')}
          message={t('admin.dialogs.closeMessage')}
          confirmLabel={t('admin.dialogs.closeConfirm')}
          danger
          onConfirm={handleCloseSession}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {confirmDialog === 'delete' && (
        <ConfirmDialog
          title={t('admin.dialogs.deleteTitle')}
          message={t('admin.dialogs.deleteMessage')}
          confirmLabel={t('admin.dialogs.deleteConfirm')}
          danger
          onConfirm={handleDeleteSession}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-lg">Zamanla</span>
            </Link>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="text-sm text-gray-500 hidden sm:inline">{t('admin.breadcrumb')}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <LanguageSwitcher />
            <Badge variant="warning" size="sm">{t('admin.badge')}</Badge>
          </div>
        </div>
      </nav>

      {/* Session Header */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  <InlineEditField
                    value={session.title}
                    onSave={handleUpdateTitle}
                    label="title"
                  />
                </h1>
                {session.isClosed && (
                  <Badge variant="danger" size="sm" dot>{t('session.closed')}</Badge>
                )}
              </div>
              <div className="text-sm text-gray-500 mb-2">
                <InlineEditField
                  value={session.description}
                  onSave={handleUpdateDescription}
                  label="description"
                  multiline
                />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                <span>{formatDateRange(session.dateStart, session.dateEnd, tz)}</span>
                <span>{session.dayStartTime} – {session.dayEndTime}</span>
                <span>{tz}</span>
                <span>{t('common.slotMinutes', { count: session.slotMinutes })}</span>
                <span>{t('admin.participantCount', { count: participants.length })}</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
              {/* Export buttons — full label on sm+, icon-only on mobile */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  title={t('admin.actions.exportCsv')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="hidden sm:inline">{t('admin.actions.exportCsv')}</span>
                  <span className="sm:hidden">CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  title={t('admin.actions.exportJson')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span className="hidden sm:inline">{t('admin.actions.exportJson')}</span>
                  <span className="sm:hidden">JSON</span>
                </button>
              </div>
              <div className="flex gap-2">
                {!session.isClosed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    onClick={() => setConfirmDialog('close')}
                    loading={closeMutation.isPending}
                  >
                    {t('admin.actions.closeSession')}
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDialog('delete')}
                  loading={deleteMutation.isPending}
                >
                  {t('admin.actions.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-gray-100 sticky top-14 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-2 py-1">
            {tabs.map((tab) => (
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Participants */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {t('admin.overview.participantsTitle', { count: participants.length })}
                </h2>
              </div>
              {participants.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">
                  {t('admin.overview.participantsEmpty')}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {participants.map((p, i) => (
                    <li key={p.id || i} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">
                          {t('admin.overview.availableSlots', { count: p.availableCount })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick results preview */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">{t('admin.overview.bestTimesPreview')}</h2>
              </div>
              <div className="p-4">
                {resultsLoading ? (
                  <InlineLoader />
                ) : (
                  <BestTimesPanel
                    results={results || []}
                    session={session}
                    onHighlight={() => {}}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results tab */}
        {activeTab === 'results' && (
          <div className="flex flex-col gap-4">
            {resultsLoading ? (
              <InlineLoader message={t('admin.results.loading')} />
            ) : (
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
            )}
          </div>
        )}

        {/* Links tab */}
        {activeTab === 'links' && (
          <div className="flex flex-col gap-4 max-w-2xl">
            {/* Claim ownership */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{t('admin.claim.title')}</p>

                  {currentUserLoading ? (
                    <p className="text-xs text-gray-500 mt-1">{t('admin.claim.loading')}</p>
                  ) : claimStatus === 'anonymous' ? (
                    <>
                      <p className="text-xs text-gray-500 mt-1">{t('admin.claim.anonymousMessage')}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Link to={claimLoginPath}>
                          <Button variant="primary" size="sm">{t('admin.claim.actions.login')}</Button>
                        </Link>
                        <Link to={claimRegisterPath}>
                          <Button variant="secondary" size="sm">{t('admin.claim.actions.register')}</Button>
                        </Link>
                      </div>
                    </>
                  ) : claimStatus === 'claimable' ? (
                    <>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.claim.claimableMessage', { email: currentUser?.email })}
                      </p>
                      <div className="mt-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleClaimSession}
                          loading={claimMutation.isPending}
                        >
                          {t('admin.claim.actions.claim')}
                        </Button>
                      </div>
                    </>
                  ) : claimStatus === 'ownedByCurrentUser' ? (
                    <>
                      <p className="text-xs text-emerald-700 mt-1">{t('admin.claim.ownedByYou')}</p>
                      <div className="mt-3">
                        <Link to="/my/schedules">
                          <Button variant="secondary" size="sm">{t('admin.claim.actions.openDashboard')}</Button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 mt-1">{t('admin.claim.ownedByAnother')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin link warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex gap-3 mb-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800">{t('admin.share.adminWarningTitle')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {t('admin.share.adminWarningMessage')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                <code className="flex-1 text-xs text-gray-600 truncate">{adminUrl}</code>
                <CopyButton text={adminUrl} />
              </div>
            </div>

            {/* Public share link */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {t('admin.share.participantLinkTitle')}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {t('admin.share.participantLinkDesc')}
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                <code className="flex-1 text-xs text-gray-600 truncate">{publicUrl}</code>
                <CopyButton text={publicUrl} />
              </div>
              <div className="mt-3">
                <Link to={`/s/${session.publicToken}`} target="_blank">
                  <Button variant="secondary" size="sm">
                    {t('admin.share.openParticipantView')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { t } = useTranslation()
  const { adminToken } = useParams()
  const { data: session, isLoading, isError, error, refetch } = useAdminSession(adminToken)

  if (isLoading) {
    return <PageLoader message={t('admin.loading')} />
  }

  if (isError) {
    const is404 = error?.response?.status === 404
    const is403 = error?.response?.status === 403
    return (
      <PageError
        title={
          is404
            ? t('admin.errors.sessionNotFound')
            : is403
            ? t('admin.errors.accessDenied')
            : t('admin.errors.loadError')
        }
        message={
          is404
            ? t('admin.errors.sessionNotFoundMessage')
            : is403
            ? t('admin.errors.accessDeniedMessage')
            : error?.userMessage
        }
        onRetry={is404 || is403 ? undefined : refetch}
      />
    )
  }

  if (!session) return null

  return (
    <ToastProvider>
      <AdminContent session={session} adminToken={adminToken} />
    </ToastProvider>
  )
}
