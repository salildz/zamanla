import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  useAdminSession,
  useUpdateSession,
  useDeleteSession,
  useCloseSession,
  useResults,
} from '../hooks/useSession.js'
import { exportSession } from '../services/api.js'
import { generateSessionSlots, formatDateRange } from '../utils/slotUtils.js'
import ResultsHeatmap from '../components/results/ResultsHeatmap.jsx'
import BestTimesPanel from '../components/results/BestTimesPanel.jsx'
import Button from '../components/common/Button.jsx'
import Badge from '../components/common/Badge.jsx'
import { PageLoader, InlineLoader } from '../components/common/LoadingSpinner.jsx'
import ErrorMessage, { PageError } from '../components/common/ErrorMessage.jsx'
import { ToastProvider, useToast } from '../components/common/Toast.jsx'

dayjs.extend(utc)
dayjs.extend(timezone)

function CopyButton({ text, label, className }) {
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
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  )
}

function InlineEditField({ value, onSave, label, multiline = false }) {
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
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="flex-1 rounded-md border border-indigo-400 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-md border border-indigo-400 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        <div className="flex gap-1 mt-0.5">
          <button
            onClick={handleSave}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-1"
          >
            Save
          </button>
          <button
            onClick={() => {
              setDraft(value || '')
              setEditing(false)
            }}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2">
      <span className={multiline ? 'text-sm text-gray-600 whitespace-pre-wrap' : ''}>{value || <span className="text-gray-400 italic">None</span>}</span>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 mt-0.5"
        title={`Edit ${label}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-slide-up">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
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
  const toast = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [highlightedSlot, setHighlightedSlot] = useState(null)

  const updateMutation = useUpdateSession(adminToken)
  const closeMutation = useCloseSession(adminToken)
  const deleteMutation = useDeleteSession(adminToken)

  const { data: results, isLoading: resultsLoading } = useResults(session.publicToken, {
    refetchInterval: 30000,
  })

  const allSlots = generateSessionSlots(session)
  const tz = session.timezone
  const baseUrl = window.location.origin
  const publicUrl = `${baseUrl}/s/${session.publicToken}`
  const adminUrl = `${baseUrl}/admin/${adminToken}`

  const handleUpdateTitle = async (title) => {
    try {
      await updateMutation.mutateAsync({ title })
      toast.success('Title updated.')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update title.')
    }
  }

  const handleUpdateDescription = async (description) => {
    try {
      await updateMutation.mutateAsync({ description })
      toast.success('Description updated.')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update description.')
    }
  }

  const handleCloseSession = async () => {
    setConfirmDialog(null)
    try {
      await closeMutation.mutateAsync()
      toast.success('Session closed. No more responses will be accepted.')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to close session.')
    }
  }

  const handleDeleteSession = async () => {
    setConfirmDialog(null)
    try {
      await deleteMutation.mutateAsync()
      toast.success('Session deleted.')
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete session.')
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
      toast.success(`Exported as ${format.toUpperCase()}.`)
    } catch (err) {
      toast.error(err.userMessage || 'Export failed.')
    }
  }

  const participants = session.participants || []
  const highlightedSlots = highlightedSlot ? new Set([highlightedSlot]) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirm dialogs */}
      {confirmDialog === 'close' && (
        <ConfirmDialog
          title="Close this session?"
          message="Participants will no longer be able to submit or edit their availability. This cannot be undone."
          confirmLabel="Close Session"
          danger
          onConfirm={handleCloseSession}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {confirmDialog === 'delete' && (
        <ConfirmDialog
          title="Delete this session?"
          message="All data including participant responses will be permanently deleted. This cannot be undone."
          confirmLabel="Delete Permanently"
          danger
          onConfirm={handleDeleteSession}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
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
            <span className="text-sm text-gray-500 hidden sm:inline">Admin Dashboard</span>
          </div>
          <Badge variant="warning" size="sm">Admin View</Badge>
        </div>
      </nav>

      {/* Session Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  <InlineEditField
                    value={session.title}
                    onSave={handleUpdateTitle}
                    label="title"
                  />
                </h1>
                {session.isClosed && (
                  <Badge variant="danger" size="sm" dot>Closed</Badge>
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
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span>{formatDateRange(session.dateStart, session.dateEnd, tz)}</span>
                <span>{session.dayStartTime} – {session.dayEndTime}</span>
                <span>{tz}</span>
                <span>{session.slotMinutes}min slots</span>
                <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('csv')}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
              >
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('json')}
              >
                Export JSON
              </Button>
              {!session.isClosed && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => setConfirmDialog('close')}
                  loading={closeMutation.isPending}
                >
                  Close Session
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDialog('delete')}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 -mb-px">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'results', label: 'Group Results' },
              { id: 'links', label: 'Share Links' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : 'tab-button-inactive'}`}
              >
                {tab.label}
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
                  Participants ({participants.length})
                </h2>
              </div>
              {participants.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">
                  No participants yet. Share the link below to get responses.
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
                        {p.slots && (
                          <p className="text-xs text-gray-400">
                            {p.slots.filter((s) => s.status === 'available').length} available slots
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick results preview */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Best Times Preview</h2>
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
              <InlineLoader message="Loading results..." />
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
            {/* Admin link warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex gap-3 mb-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800">Keep your admin link safe!</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Anyone with this link can manage, edit, or delete this session. There is no recovery if lost.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                <code className="flex-1 text-xs text-gray-600 truncate">{adminUrl}</code>
                <CopyButton text={adminUrl} label="Copy" />
              </div>
            </div>

            {/* Public share link */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Participant Link
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Share this link with anyone you want to invite.
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                <code className="flex-1 text-xs text-gray-600 truncate">{publicUrl}</code>
                <CopyButton text={publicUrl} label="Copy" />
              </div>
              <div className="mt-3">
                <Link to={`/s/${session.publicToken}`} target="_blank">
                  <Button variant="secondary" size="sm">
                    Open Participant View
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
  const { adminToken } = useParams()
  const { data: session, isLoading, isError, error, refetch } = useAdminSession(adminToken)

  if (isLoading) {
    return <PageLoader message="Loading admin dashboard..." />
  }

  if (isError) {
    const is404 = error?.response?.status === 404
    const is403 = error?.response?.status === 403
    return (
      <PageError
        title={
          is404
            ? 'Session not found'
            : is403
            ? 'Access denied'
            : 'Could not load session'
        }
        message={
          is404
            ? 'This admin link may be incorrect or the session may have been deleted.'
            : is403
            ? 'You do not have permission to manage this session.'
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
