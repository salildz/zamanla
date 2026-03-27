import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import Select from '../components/common/Select.jsx'
import TurnstileWidget, { isTurnstileEnabled } from '../components/common/TurnstileWidget.jsx'
import { createSession } from '../services/api.js'
import { getBrowserTimezone, getTimezoneOptionsWithOffset } from '../utils/timezoneUtils.js'

const today = dayjs().format('YYYY-MM-DD')
const twoWeeksLater = dayjs().add(14, 'day').format('YYYY-MM-DD')

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
    description: z.string().max(500, 'Description too long').optional(),
    timezone: z.string().min(1, 'Timezone is required'),
    dateStart: z.string().min(1, 'Start date is required'),
    dateEnd: z.string().min(1, 'End date is required'),
    slotMinutes: z.coerce.number().int().min(15).max(120),
    dayStartTime: z.string().min(1, 'Day start time is required'),
    dayEndTime: z.string().min(1, 'Day end time is required'),
    includeWeekends: z.boolean(),
  })
  .refine((d) => d.dateEnd >= d.dateStart, {
    message: 'End date must be on or after start date',
    path: ['dateEnd'],
  })
  .refine((d) => d.dayEndTime > d.dayStartTime, {
    message: 'Day end time must be after start time',
    path: ['dayEndTime'],
  })

const slotOptions = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '60 minutes' },
  { value: '90', label: '90 minutes' },
  { value: '120', label: '2 hours' },
]

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
    >
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  )
}

export default function CreateSessionPage() {
  const navigate = useNavigate()
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [created, setCreated] = useState(null)
  const tzOptions = getTimezoneOptionsWithOffset()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      timezone: getBrowserTimezone(),
      dateStart: today,
      dateEnd: twoWeeksLater,
      slotMinutes: 30,
      dayStartTime: '09:00',
      dayEndTime: '18:00',
      includeWeekends: false,
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => createSession(data),
    onSuccess: (session) => {
      setCreated(session)
    },
  })

  const onSubmit = (values) => {
    if (isTurnstileEnabled() && !turnstileToken) {
      return
    }
    mutation.mutate({
      ...values,
      slotMinutes: Number(values.slotMinutes),
      ...(isTurnstileEnabled() && turnstileToken ? { turnstileToken } : {}),
    })
  }

  const baseUrl = window.location.origin

  if (created) {
    const publicUrl = `${baseUrl}/s/${created.publicToken}`
    const adminUrl = `${baseUrl}/admin/${created.adminToken}`

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Nav */}
        <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-lg">Zamanla</span>
            </Link>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            {/* Success header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Session Created!</h1>
              <p className="text-gray-500">
                <span className="font-medium text-gray-700">{created.title}</span> is ready to share.
              </p>
            </div>

            {/* Admin link warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800">Save your admin link!</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This is the only way to manage your session. There is no way to recover it if lost.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                <span className="flex-1 text-xs text-gray-600 font-mono truncate">{adminUrl}</span>
                <CopyButton text={adminUrl} label="Copy" />
              </div>
              <div className="mt-2 flex justify-center">
                <Link to={`/admin/${created.adminToken}`}>
                  <Button variant="secondary" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-50">
                    Go to Admin Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Public share link */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Share this link with participants
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                <span className="flex-1 text-xs text-gray-600 font-mono truncate">{publicUrl}</span>
                <CopyButton text={publicUrl} label="Copy" />
              </div>
              <div className="mt-3 flex justify-center">
                <Link to={`/s/${created.publicToken}`}>
                  <Button variant="primary" size="sm">
                    View Session Page
                  </Button>
                </Link>
              </div>
            </div>

            <div className="text-center">
              <Link to="/create" className="text-sm text-indigo-600 hover:text-indigo-800">
                Create another session
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Zamanla</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">New Session</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create a Scheduling Session</h1>
          <p className="text-gray-500 mt-1">
            Set up your availability poll. You can share it right away.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {/* Basic Info */}
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Basic Info
              </h2>
              <div className="flex flex-col gap-4">
                <Input
                  label="Session Title"
                  required
                  placeholder="e.g. Team Standup Time"
                  error={errors.title?.message}
                  {...register('title')}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 resize-none"
                    rows={3}
                    placeholder="Optional: describe the meeting or any context"
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-600">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Date Range
              </h2>
              <div className="flex flex-col gap-4">
                <Select
                  label="Timezone"
                  required
                  options={tzOptions.map((t) => ({ value: t.value, label: t.displayLabel }))}
                  error={errors.timezone?.message}
                  {...register('timezone')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Start Date"
                    type="date"
                    required
                    error={errors.dateStart?.message}
                    {...register('dateStart')}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    required
                    error={errors.dateEnd?.message}
                    {...register('dateEnd')}
                  />
                </div>
              </div>
            </div>

            {/* Time Settings */}
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Daily Time Window
              </h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Day Start Time"
                    type="time"
                    required
                    error={errors.dayStartTime?.message}
                    {...register('dayStartTime')}
                  />
                  <Input
                    label="Day End Time"
                    type="time"
                    required
                    error={errors.dayEndTime?.message}
                    {...register('dayEndTime')}
                  />
                </div>
                <Select
                  label="Slot Size"
                  required
                  options={slotOptions}
                  error={errors.slotMinutes?.message}
                  {...register('slotMinutes')}
                />
                <div className="flex items-center gap-3">
                  <input
                    id="includeWeekends"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    {...register('includeWeekends')}
                  />
                  <label htmlFor="includeWeekends" className="text-sm text-gray-700">
                    Include weekends (Saturday & Sunday)
                  </label>
                </div>
              </div>
            </div>

            {/* Turnstile */}
            {isTurnstileEnabled() && (
              <div className="px-6 py-5">
                <TurnstileWidget
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                />
                {mutation.isPending === false && isTurnstileEnabled() && !turnstileToken && (
                  <p className="text-xs text-amber-600 mt-1">
                    Please complete the security check.
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="px-6 py-5 bg-gray-50 flex flex-col gap-3">
              {mutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {mutation.error?.userMessage || 'Failed to create session. Please try again.'}
                </div>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={mutation.isPending}
                disabled={isTurnstileEnabled() && !turnstileToken}
              >
                {mutation.isPending ? 'Creating session...' : 'Create Session'}
              </Button>
              <p className="text-xs text-center text-gray-400">
                You'll get a shareable link and an admin link to manage the session.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
