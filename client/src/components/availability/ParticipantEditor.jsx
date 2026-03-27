import { useState, useEffect, useCallback, useMemo } from 'react'
import AvailabilityGrid from './AvailabilityGrid.jsx'
import RecurringRuleForm from './RecurringRuleForm.jsx'
import Button from '../common/Button.jsx'
import { generateSessionSlots, applyRulesToSlots } from '../../utils/slotUtils.js'
import { useSaveAvailability } from '../../hooks/useParticipant.js'
import { useToast } from '../common/Toast.jsx'

export default function ParticipantEditor({ session, participant, publicToken }) {
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
            // Override rule: mark as unavailable
            next[slotStart] = 'unavailable'
          } else {
            // Was manual available — remove manual override (becomes unavailable)
            if (next[slotStart] === 'available') {
              delete next[slotStart]
            } else {
              next[slotStart] = 'unavailable'
            }
          }
        } else {
          // Mark available
          if (fromRule && prev[slotStart] === 'unavailable') {
            // Remove the override that was hiding the rule
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
            // Setting available
            if (fromRule && next[slotStart] === 'unavailable') {
              delete next[slotStart]
            } else if (!fromRule) {
              next[slotStart] = 'available'
            }
          } else {
            // Setting unavailable
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
    // Build slots array
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
      toast.success('Availability saved!')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to save availability.')
    }
  }

  const handleClearAll = () => {
    setRules([])
    setManualOverrides({})
    setIsDirty(true)
  }

  const availableCount = effectiveAvailability.size

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-800">
            Your Availability
            {participant?.name && (
              <span className="font-normal text-gray-500 ml-1.5">— {participant.name}</span>
            )}
          </h2>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {availableCount} slot{availableCount !== 1 ? 's' : ''} marked
          </span>
          {isDirty && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={saveMutation.isPending}
          >
            Clear all
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Availability'}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500">
        Click or drag to toggle time slots. Use recurring rules to quickly fill in weekly patterns.
      </p>

      {/* Main layout: rules panel + grid */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Recurring Rules Panel */}
        <div className="lg:w-52 xl:w-60 shrink-0">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <RecurringRuleForm
              rules={rules}
              onRulesChange={handleRulesChange}
              session={session}
            />
          </div>
        </div>

        {/* Grid */}
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

      {/* Save button (bottom, for mobile) */}
      <div className="flex justify-end lg:hidden">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          loading={saveMutation.isPending}
          disabled={!isDirty}
          className="w-full sm:w-auto"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>
    </div>
  )
}
