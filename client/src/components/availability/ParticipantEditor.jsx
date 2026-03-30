import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import AvailabilityGrid from './AvailabilityGrid.jsx'
import RecurringRuleForm from './RecurringRuleForm.jsx'
import Button from '../common/Button.jsx'
import { generateSessionSlots, applyRulesToSlots } from '../../utils/slotUtils.js'
import { useSaveAvailability } from '../../hooks/useParticipant.js'
import { useToast } from '../common/Toast.jsx'

const MOBILE_ONBOARDING_KEY = 'zamanla_mobile_onboarding_v1_seen'

export default function ParticipantEditor({ session, participant, publicToken }) {
  const { t } = useTranslation()
  const toast = useToast()
  const saveMutation = useSaveAvailability(publicToken, participant?.editToken)

  // Initialize from saved participant data
  const [rules, setRules] = useState(() => participant?.rules || [])
  const [manualOverrides, setManualOverrides] = useState(() => {
    const overrides = {}
    if (participant?.slots) {
      for (const slot of participant.slots) {
        if (slot.sourceType === 'manual') {
          overrides[slot.slotStart] = slot.status
        }
      }
    }
    return overrides
  })
  const [isDirty, setIsDirty] = useState(false)
  const [rulesExpanded, setRulesExpanded] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [lastClearedState, setLastClearedState] = useState(null)
  const [showUndoClear, setShowUndoClear] = useState(false)
  const undoTimerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const syncMobileState = () => {
      setIsMobile(mediaQuery.matches)
    }

    syncMobileState()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMobileState)
      return () => mediaQuery.removeEventListener('change', syncMobileState)
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(syncMobileState)
      return () => mediaQuery.removeListener(syncMobileState)
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return

    try {
      const alreadySeen = window.localStorage.getItem(MOBILE_ONBOARDING_KEY) === '1'
      if (alreadySeen) return

      window.localStorage.setItem(MOBILE_ONBOARDING_KEY, '1')
      setOnboardingStep(0)
      setShowOnboarding(true)
    } catch {
      // Storage can fail in private mode; still show onboarding once per tab life.
      setOnboardingStep(0)
      setShowOnboarding(true)
    }
  }, [isMobile])

  const openOnboarding = useCallback(() => {
    setOnboardingStep(0)
    setShowOnboarding(true)
  }, [])

  useEffect(() => {
    if (!showOnboarding) return undefined

    const stepTimer = window.setInterval(() => {
      setOnboardingStep((current) => Math.min(current + 1, 2))
    }, 5000)

    const closeTimer = window.setTimeout(() => {
      setShowOnboarding(false)
    }, 15000)

    return () => {
      window.clearInterval(stepTimer)
      window.clearTimeout(closeTimer)
    }
  }, [showOnboarding])

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty || saveMutation.isPending) return
      event.preventDefault()
      event.returnValue = t('availability.unsavedLeaveWarning')
      return event.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, saveMutation.isPending, t])

  // All session slots
  const allSlots = useMemo(() => generateSessionSlots(session), [session])

  // Compute rule-based availability
  const ruleAvailability = useMemo(
    () => applyRulesToSlots(session, rules),
    [session, rules]
  )

  // Effective availability: manual overrides take precedence over rules
  const effectiveAvailability = useMemo(() => {
    const set = new Set(ruleAvailability)
    for (const [slotStart, status] of Object.entries(manualOverrides)) {
      if (status === 'available') {
        set.add(slotStart)
      } else {
        set.delete(slotStart)
      }
    }
    return set
  }, [ruleAvailability, manualOverrides])

  const handleRulesChange = useCallback(
    (newRules) => {
      setRules(newRules)
      setIsDirty(true)
    },
    []
  )

  const handleToggle = useCallback(
    (slotStart) => {
      const currentlyAvailable = effectiveAvailability.has(slotStart)
      setManualOverrides((prev) => {
        const next = { ...prev }
        const fromRule = ruleAvailability.has(slotStart)

        if (currentlyAvailable) {
          // Mark unavailable
          if (fromRule) {
            next[slotStart] = 'unavailable'
          } else {
            if (next[slotStart] === 'available') {
              delete next[slotStart]
            } else {
              next[slotStart] = 'unavailable'
            }
          }
        } else {
          // Mark available
          if (fromRule && prev[slotStart] === 'unavailable') {
            delete next[slotStart]
          } else {
            next[slotStart] = 'available'
          }
        }
        return next
      })
      setIsDirty(true)
    },
    [effectiveAvailability, ruleAvailability]
  )

  const handleDragSelect = useCallback(
    (slotStarts, value) => {
      setManualOverrides((prev) => {
        const next = { ...prev }
        for (const slotStart of slotStarts) {
          const fromRule = ruleAvailability.has(slotStart)
          if (value) {
            if (fromRule && next[slotStart] === 'unavailable') {
              delete next[slotStart]
            } else if (!fromRule) {
              next[slotStart] = 'available'
            }
          } else {
            if (fromRule) {
              next[slotStart] = 'unavailable'
            } else {
              if (next[slotStart] === 'available') {
                delete next[slotStart]
              }
            }
          }
        }
        return next
      })
      setIsDirty(true)
    },
    [ruleAvailability]
  )

  const handleSave = async () => {
    // Only send manual overrides (both available and unavailable).
    // Rule-derived slots are fully regenerated server-side from the rules array.
    // Sending only manual slots lets the server cleanly replace the manual layer.
    const slotEndLookup = new Map(allSlots.map((s) => [s.slotStart, s.slotEnd]))
    const validManualOverrides = {}
    const slots = []
    for (const [slotStart, status] of Object.entries(manualOverrides)) {
      const slotEnd = slotEndLookup.get(slotStart)
      if (!slotEnd) continue
      validManualOverrides[slotStart] = status
      slots.push({
        slotStart,
        slotEnd,
        status,
        sourceType: 'manual',
      })
    }
    const droppedOverrideCount =
      Object.keys(manualOverrides).length - Object.keys(validManualOverrides).length

    try {
      await saveMutation.mutateAsync({ rules, slots })
      if (droppedOverrideCount > 0) {
        setManualOverrides(validManualOverrides)
        toast.info(t('availability.toast.adjustedStale', { count: droppedOverrideCount }))
      }
      setShowUndoClear(false)
      setLastClearedState(null)
      setIsDirty(false)
      toast.success(t('availability.toast.saved'))
    } catch (err) {
      toast.error(err.userMessage || t('availability.toast.saveFailed'))
    }
  }

  const handleClearAll = () => {
    if (rules.length === 0 && Object.keys(manualOverrides).length === 0) {
      return
    }

    setLastClearedState({
      rules: [...rules],
      manualOverrides: { ...manualOverrides },
    })
    setRules([])
    setManualOverrides({})
    setIsDirty(true)
    setShowUndoClear(true)

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }
    undoTimerRef.current = setTimeout(() => {
      setShowUndoClear(false)
      setLastClearedState(null)
      undoTimerRef.current = null
    }, 8000)

    toast.info(t('availability.toast.cleared'))
  }

  const handleUndoClear = () => {
    if (!lastClearedState) return
    setRules(lastClearedState.rules)
    setManualOverrides(lastClearedState.manualOverrides)
    setIsDirty(true)
    setShowUndoClear(false)
    setLastClearedState(null)
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    toast.success(t('availability.toast.undoCleared'))
  }

  const availableCount = effectiveAvailability.size
  const onboardingSteps = [
    {
      title: t('availability.tour.step1Title'),
      description: t('availability.tour.step1Desc'),
    },
    {
      title: t('availability.tour.step2Title'),
      description: t('availability.tour.step2Desc'),
    },
    {
      title: t('availability.tour.step3Title'),
      description: t('availability.tour.step3Desc'),
    },
  ]
  const currentOnboarding = onboardingSteps[onboardingStep] || onboardingSteps[0]

  return (
    // pb-20 on mobile so the sticky save bar doesn't obscure content
    <div className="flex flex-col gap-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-gray-800">
            {participant?.name
              ? t('availability.titleWithName', { name: participant.name })
              : t('availability.title')}
          </h2>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {t('availability.availableSlots', { count: availableCount })}
          </span>
          {isDirty && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              {t('availability.unsavedChanges')}
            </span>
          )}
        </div>
        {/* Desktop action buttons — hidden on mobile (mobile uses sticky bar) */}
        <div className="hidden lg:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={saveMutation.isPending}
          >
            {t('availability.clearAll')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            {saveMutation.isPending ? t('availability.savingButton') : t('availability.saveButton')}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          {t('availability.instructions')}
        </p>
        {isMobile && (
          <button
            type="button"
            onClick={openOnboarding}
            aria-label={t('availability.tour.helpAria')}
            title={t('availability.tour.helpAria')}
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9a3.75 3.75 0 117.489 0c0 1.379-.935 2.215-2.033 2.928-.96.624-1.717 1.275-1.717 2.322v.25M12 17.5h.01" />
            </svg>
          </button>
        )}
      </div>

      {showOnboarding && isMobile && (
        <div className="lg:hidden rounded-2xl border px-4 py-3 shadow-sm reveal-fade onboarding-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold mb-1 onboarding-kicker">
                {t('availability.tour.title')}
              </p>
              <h3 className="text-sm font-semibold text-gray-900">{currentOnboarding.title}</h3>
              <p className="text-xs mt-1 leading-relaxed onboarding-copy">{currentOnboarding.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowOnboarding(false)}
              className="shrink-0 text-xs font-semibold onboarding-link"
            >
              {t('availability.tour.dismiss')}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {onboardingSteps.map((_, idx) => (
                <span
                  key={idx}
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    idx <= onboardingStep ? 'w-5 onboarding-dot-active' : 'w-2.5 onboarding-dot-inactive'
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowOnboarding(false)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md onboarding-primary-btn"
            >
              {t('availability.tour.gotIt')}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-gray-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          {t('availability.legend.fromRule')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-gray-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
          {t('availability.legend.manual')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-gray-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
          {t('availability.legend.unavailable')}
        </span>
      </div>

      {showUndoClear && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
          <span className="text-amber-800">
            {t('availability.clearUndoBanner')}
          </span>
          <button
            type="button"
            onClick={handleUndoClear}
            className="text-amber-900 font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            {t('availability.clearUndoAction')}
          </button>
        </div>
      )}

      {/* Main layout: rules panel + grid */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Recurring Rules Panel */}
        <div className="lg:w-52 xl:w-60 shrink-0">
          {/* Mobile: collapsible toggle header */}
          <button
            type="button"
            className="w-full lg:hidden flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 mb-1 active:bg-gray-100"
            onClick={() => setRulesExpanded((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('availability.rules.title')}
              {rules.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none">
                  {rules.length}
                </span>
              )}
            </span>
            <svg
              className={clsx('w-4 h-4 text-gray-400 transition-transform duration-200', rulesExpanded && 'rotate-180')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={clsx(
            'bg-gray-50 border border-gray-200 rounded-lg p-4',
            !rulesExpanded && 'hidden lg:block'
          )}>
            <RecurringRuleForm
              rules={rules}
              onRulesChange={handleRulesChange}
              session={session}
            />
          </div>
        </div>

        {/* Availability Grid */}
        <div className="flex-1 min-w-0">
          <div className={clsx(
            'rounded-xl transition-all',
            showOnboarding && onboardingStep < 2 && 'onboarding-focus'
          )}>
            <AvailabilityGrid
              session={session}
              slots={allSlots}
              availability={effectiveAvailability}
              manualOverrides={manualOverrides}
              onToggle={handleToggle}
              onDragSelect={handleDragSelect}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky save bar — fixed at bottom of viewport */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 transition-shadow',
          showOnboarding && onboardingStep === 2 && 'onboarding-save-focus'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            {availableCount > 0 ? (
              <span className="text-sm font-medium text-gray-700 truncate">
                {t('availability.availableSlots', { count: availableCount })}
              </span>
            ) : (
              <span className="text-sm text-gray-400 truncate">
                {t('availability.noSlotsSelected')}
              </span>
            )}
            {isDirty && (
              <span className="text-xs text-amber-600 shrink-0 font-medium">
                · {t('availability.unsaved')}
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={handleClearAll}
              disabled={saveMutation.isPending || availableCount === 0}
            >
              {t('availability.clearAll')}
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSave}
              loading={saveMutation.isPending}
              disabled={!isDirty}
            >
              {saveMutation.isPending ? t('availability.savingButton') : t('availability.saveButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
