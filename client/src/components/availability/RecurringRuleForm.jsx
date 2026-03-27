import { useState } from 'react'
import clsx from 'clsx'
import Button from '../common/Button.jsx'

const DAYS = [
  { label: 'S', fullLabel: 'Sun', value: 0 },
  { label: 'M', fullLabel: 'Mon', value: 1 },
  { label: 'T', fullLabel: 'Tue', value: 2 },
  { label: 'W', fullLabel: 'Wed', value: 3 },
  { label: 'T', fullLabel: 'Thu', value: 4 },
  { label: 'F', fullLabel: 'Fri', value: 5 },
  { label: 'S', fullLabel: 'Sat', value: 6 },
]

function generateRuleId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function formatRuleLabel(rule) {
  const dayNames = rule.weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAYS.find((day) => day.value === d)?.fullLabel)
    .join(', ')
  return `${dayNames} · ${rule.startTime}–${rule.endTime}`
}

export default function RecurringRuleForm({ rules, onRulesChange, session }) {
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]) // Mon–Fri default
  const [startTime, setStartTime] = useState(session?.dayStartTime || '09:00')
  const [endTime, setEndTime] = useState(session?.dayEndTime || '17:00')
  const [error, setError] = useState('')

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleApply = () => {
    setError('')

    if (selectedDays.length === 0) {
      setError('Select at least one day.')
      return
    }
    if (!startTime || !endTime) {
      setError('Enter both start and end time.')
      return
    }
    if (startTime >= endTime) {
      setError('Start time must be before end time.')
      return
    }

    const newRule = {
      id: generateRuleId(),
      weekdays: [...selectedDays].sort((a, b) => a - b),
      startTime,
      endTime,
    }

    onRulesChange([...rules, newRule])
    setError('')
  }

  const handleDelete = (ruleId) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId))
  }

  const handleClearAll = () => {
    onRulesChange([])
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recurring Availability</h3>
        <p className="text-xs text-gray-500 mb-3">
          Set weekly patterns to auto-fill matching time slots.
        </p>

        {/* Day selector */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Days</label>
          <div className="flex gap-1">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                title={day.fullLabel}
                onClick={() => toggleDay(day.value)}
                className={clsx(
                  'w-8 h-8 rounded-full text-xs font-semibold transition-colors',
                  selectedDays.includes(day.value)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">From</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={session?.dayStartTime}
              max={session?.dayEndTime}
              className="w-full rounded-md border border-gray-300 bg-white text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">To</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={session?.dayStartTime}
              max={session?.dayEndTime}
              className="w-full rounded-md border border-gray-300 bg-white text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={handleApply}
        >
          Apply Rule
        </Button>
      </div>

      {/* Active rules list */}
      {rules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Active Rules ({rules.length})
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-2 bg-teal-50 border border-teal-200 rounded-md px-2.5 py-1.5"
              >
                <span className="text-xs text-teal-800 font-medium flex-1 min-w-0 truncate">
                  {formatRuleLabel(rule)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="shrink-0 text-teal-400 hover:text-red-500 transition-colors"
                  title="Delete rule"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rules.length === 0 && (
        <div className="text-center py-4 text-xs text-gray-400">
          No active rules. Add one above to auto-fill your availability.
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Legend</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-teal-200 border border-teal-300 shrink-0" />
            <span className="text-xs text-gray-500">From recurring rule</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-indigo-400 border border-indigo-500 shrink-0" />
            <span className="text-xs text-gray-500">Manually confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-white border border-gray-200 shrink-0" />
            <span className="text-xs text-gray-500">Not available</span>
          </div>
        </div>
      </div>
    </div>
  )
}
