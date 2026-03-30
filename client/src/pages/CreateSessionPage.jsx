import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import Select from '../components/common/Select.jsx'
import TimezoneCombobox from '../components/common/TimezoneCombobox.jsx'
import TurnstileWidget, { isTurnstileEnabled } from '../components/common/TurnstileWidget.jsx'
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx'
import ThemeSwitcher from '../components/common/ThemeSwitcher.jsx'
import { createSession } from '../services/api.js'
import { getBrowserTimezone } from '../utils/timezoneUtils.js'
import { useCreateSessionSchema } from '../hooks/useSchemas.js'

const today = dayjs().format('YYYY-MM-DD')
const twoWeeksLater = dayjs().add(14, 'day').format('YYYY-MM-DD')

function CopyButton({ text, label }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
      {copied ? t('common.copied') : (label || t('common.copy'))}
    </button>
  )
}

export default function CreateSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [created, setCreated] = useState(null)
  const schema = useCreateSessionSchema()

  const slotOptions = [
    { value: '15', label: t('create.slots.15') },
    { value: '30', label: t('create.slots.30') },
    { value: '60', label: t('create.slots.60') },
    { value: '90', label: t('create.slots.90') },
    { value: '120', label: t('create.slots.120') },
  ]

  const {
    register,
    handleSubmit,
    control,
    setValue,
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
      ...(isTurnstileEnabled() && turnstileToken ? { cfTurnstileResponse: turnstileToken } : {}),
    })
  }

  const previewTitle = watch('title')
  const previewDateStart = watch('dateStart')
  const previewDateEnd = watch('dateEnd')
  const previewDayStart = watch('dayStartTime')
  const previewDayEnd = watch('dayEndTime')
  const previewSlotMinutes = watch('slotMinutes')
  const previewTimezone = watch('timezone')

  const applyTimePreset = (preset) => {
    if (preset === 'workday') {
      setValue('dayStartTime', '09:00', { shouldDirty: true })
      setValue('dayEndTime', '18:00', { shouldDirty: true })
      setValue('includeWeekends', false, { shouldDirty: true })
      return
    }
    if (preset === 'evening') {
      setValue('dayStartTime', '18:00', { shouldDirty: true })
      setValue('dayEndTime', '22:00', { shouldDirty: true })
      setValue('includeWeekends', false, { shouldDirty: true })
      return
    }
    if (preset === 'fullDay') {
      setValue('dayStartTime', '08:00', { shouldDirty: true })
      setValue('dayEndTime', '22:00', { shouldDirty: true })
      setValue('includeWeekends', true, { shouldDirty: true })
    }
  }

  const baseUrl = window.location.origin

  if (created) {
    const publicUrl = `${baseUrl}/s/${created.publicToken}`
    const adminUrl = `${baseUrl}/admin/${created.adminToken}`
    const canShare = typeof navigator.share === 'function'

    const handleShare = async () => {
      try {
        await navigator.share({
          title: created.title,
          text: t('create.success.shareNativeText', { title: created.title }),
          url: publicUrl,
        })
      } catch {
        // User cancelled or share failed — fall through silently
      }
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Nav */}
        <nav className="border-b border-gray-100 bg-white/85 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
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

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            {/* Success header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('create.success.title')}</h1>
              <p className="text-gray-500">
                <span className="font-medium text-gray-700">{t('create.success.subtitle', { title: created.title })}</span>
              </p>
            </div>

            {/* Public share link — primary action */}
            <div className="surface-card border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {t('create.success.shareTitle')}
              </p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 mb-3">
                <span className="flex-1 text-xs text-gray-600 font-mono truncate">{publicUrl}</span>
                <CopyButton text={publicUrl} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {canShare && (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {t('create.success.shareButton')}
                  </button>
                )}
                <Link to={`/s/${created.publicToken}`} className="flex-1">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    {t('create.success.viewSessionButton')}
                  </button>
                </Link>
              </div>
            </div>

            {/* Admin link warning — secondary */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 backdrop-blur-sm">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-800">{t('create.success.adminWarningTitle')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {t('create.success.adminWarningMessage')}
                  </p>
                  <div className="mt-2 flex items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                    <span className="flex-1 text-xs text-gray-600 font-mono truncate">{adminUrl}</span>
                    <CopyButton text={adminUrl} />
                  </div>
                  <div className="mt-2">
                    <Link to={`/admin/${created.adminToken}`} className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2">
                      {t('create.success.adminDashboardButton')} →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link to="/create" className="text-sm text-indigo-600 hover:text-indigo-800">
                {t('create.success.createAnotherLink')}
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
      <nav className="border-b border-gray-100 bg-white/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
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
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">{t('nav.newSessionPage')}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('create.pageTitle')}</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">{t('create.pageSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="surface-card border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {/* Basic Info */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('create.sectionBasicInfo')}
              </h2>
              <div className="flex flex-col gap-4">
                <Input
                  label={t('create.titleLabel')}
                  required
                  placeholder={t('create.titlePlaceholder')}
                  error={errors.title?.message}
                  {...register('title')}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">{t('create.descriptionLabel')}</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 bg-gray-50 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 resize-none"
                    rows={3}
                    placeholder={t('create.descriptionPlaceholder')}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-600">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('create.sectionDateRange')}
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <TimezoneCombobox
                        label={t('create.timezoneLabel')}
                        required
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.timezone?.message}
                      />
                    )}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('create.timezoneHint')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t('create.dateStartLabel')}
                    type="date"
                    required
                    error={errors.dateStart?.message}
                    {...register('dateStart')}
                  />
                  <Input
                    label={t('create.dateEndLabel')}
                    type="date"
                    required
                    error={errors.dateEnd?.message}
                    {...register('dateEnd')}
                  />
                </div>
              </div>
            </div>

            {/* Time Settings */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('create.sectionTimeWindow')}
              </h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t('create.dayStartLabel')}
                    type="time"
                    required
                    error={errors.dayStartTime?.message}
                    {...register('dayStartTime')}
                  />
                  <Input
                    label={t('create.dayEndLabel')}
                    type="time"
                    required
                    error={errors.dayEndTime?.message}
                    {...register('dayEndTime')}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">{t('create.timePresets.title')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyTimePreset('workday')}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {t('create.timePresets.workday')}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTimePreset('evening')}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {t('create.timePresets.evening')}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTimePreset('fullDay')}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {t('create.timePresets.fullDay')}
                    </button>
                  </div>
                </div>
                <Select
                  label={t('create.slotSizeLabel')}
                  required
                  options={slotOptions}
                  error={errors.slotMinutes?.message}
                  {...register('slotMinutes')}
                />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    id="includeWeekends"
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                    {...register('includeWeekends')}
                  />
                  <span className="text-sm text-gray-700">
                    {t('create.includeWeekendsLabel')}
                  </span>
                </label>
              </div>
            </div>

            {/* Turnstile */}
            {isTurnstileEnabled() && (
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                <TurnstileWidget
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                />
                {mutation.isPending === false && isTurnstileEnabled() && !turnstileToken && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('create.turnstileWarning')}
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gray-50/70 flex flex-col gap-3">
              <div className="bg-gray-50 border border-indigo-100 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1.5">
                  {t('create.preview.title')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                  <p>
                    <span className="text-gray-500">{t('create.titleLabel')}: </span>
                    <span className="font-medium text-gray-700">{previewTitle || t('create.preview.fallbackTitle')}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{t('create.preview.dateRange')}: </span>
                    <span className="font-medium text-gray-700">{previewDateStart} - {previewDateEnd}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{t('create.preview.timeWindow')}: </span>
                    <span className="font-medium text-gray-700">{previewDayStart} - {previewDayEnd}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">{t('create.preview.slotSize')}: </span>
                      <span className="font-medium text-gray-700">{t('common.slotMinutes', { count: Number(previewSlotMinutes) || 0 })}</span>
                  </p>
                  <p className="sm:col-span-2 truncate">
                    <span className="text-gray-500">{t('create.preview.timezone')}: </span>
                    <span className="font-medium text-gray-700">{previewTimezone}</span>
                  </p>
                </div>
              </div>

              {mutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {mutation.error?.userMessage || t('create.errorGeneric')}
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
                {mutation.isPending ? t('create.submittingButton') : t('create.submitButton')}
              </Button>
              <p className="text-xs text-center text-gray-400">
                {t('create.submitFooter')}
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
