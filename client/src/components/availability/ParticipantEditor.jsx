import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import AvailabilityGrid from './AvailabilityGrid.jsx'
import RecurringRuleForm from './RecurringRuleForm.jsx'
import Button from '../common/Button.jsx'
import { generateSessionSlots, applyRulesToSlots } from '../../utils/slotUtils.js'
import { useSaveAvailability } from '../../hooks/useParticipant.js'
import { useToast } from '../common/Toast.jsx'

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
  // Mobile: start in selection mode so drag works immediately.
  // User can tap "Scroll grid" to temporarily enter scroll mode.
  const [selectionMode, setSelectionMode] = useState(true)
  const [lastClearedState, setLastClearedState] = useState(null)
  const [showUndoClear, setShowUndoClear] = useState(false)
  const undoTimerRef = useRef(null)

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
      <p className="text-sm text-gray-500">
        {t('availability.instructions')}
      </p>

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
          {/* Mobile: selection/scroll mode toggle */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">
              {selectionMode
                ? t('availability.grid.selectModeHint')
                : t('availability.grid.scrollModeHint')}
            </p>
            <button
              type="button"
              onClick={() => setSelectionMode((v) => !v)}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                selectionMode
                  ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              )}
            >
              {selectionMode ? (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                  {t('availability.grid.scrollGridButton')}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t('availability.grid.selectTimesButton')}
                </>
              )}
            </button>
          </div>

          <AvailabilityGrid
            session={session}
            slots={allSlots}
            availability={effectiveAvailability}
            manualOverrides={manualOverrides}
            onToggle={handleToggle}
            onDragSelect={handleDragSelect}
            selectionMode={selectionMode}
          />
        </div>
      </div>

      {/* Mobile sticky save bar — fixed at bottom of viewport */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-5xl mx-auto">
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
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={saveMutation.isPending || availableCount === 0}
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
      </div>
    </div>
  )
}
