import { useState, useCallback, useMemo } from 'react'
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
    const slots = allSlots
      .map((slot) => {
        const manualStatus = manualOverrides[slot.slotStart]
        const ruleStatus = ruleAvailability.has(slot.slotStart) ? 'available' : 'unavailable'
        const status = manualStatus !== undefined ? manualStatus : ruleStatus
        const sourceType = manualStatus !== undefined ? 'manual' : 'rule_derived'
        return { slotStart: slot.slotStart, slotEnd: slot.slotEnd, status, sourceType }
      })
      .filter((s) => s.status === 'available')

    try {
      await saveMutation.mutateAsync({ rules, slots })
      setIsDirty(false)
      toast.success(t('availability.toast.saved'))
    } catch (err) {
      toast.error(err.userMessage || t('availability.toast.saveFailed'))
    }
  }

  const handleClearAll = () => {
    setRules([])
    setManualOverrides({})
    setIsDirty(true)
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
