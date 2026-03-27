import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import Button from '../common/Button.jsx'

function generateRuleId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function formatRuleLabel(rule, fullDays) {
  const dayNames = rule.weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => fullDays[d])
    .join(', ')
  return `${dayNames} · ${rule.startTime}–${rule.endTime}`
}

export default function RecurringRuleForm({ rules, onRulesChange, session }) {
  const { t } = useTranslation()
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]) // Mon–Fri default
  const [startTime, setStartTime] = useState(session?.dayStartTime || '09:00')
  const [endTime, setEndTime] = useState(session?.dayEndTime || '17:00')
  const [error, setError] = useState('')
  const [justApplied, setJustApplied] = useState(false)

  const shortDays = t('availability.days.short', { returnObjects: true })
  const fullDays = t('availability.days.full', { returnObjects: true })
  const DAYS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    label: shortDays[i],
    fullLabel: fullDays[i],
    value: i,
  }))

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleApply = () => {
    setError('')

    if (selectedDays.length === 0) {
      setError(t('availability.rules.errors.noDays'))
      return
    }
    if (!startTime || !endTime) {
      setError(t('availability.rules.errors.noTimes'))
      return
    }
    if (startTime >= endTime) {
      setError(t('availability.rules.errors.invalidRange'))
      return
    }

    const newRule = {
      id: generateRuleId(),
      weekdays: [...selectedDays].sort((a, b) => a - b),
      startTime,
      endTime,
    }

    onRulesChange([...rules, newRule])

    // Reset form so it's ready for another rule immediately
    setSelectedDays([1, 2, 3, 4, 5])
    setStartTime(session?.dayStartTime || '09:00')
    setEndTime(session?.dayEndTime || '17:00')
    setError('')

    // Brief success confirmation
    setJustApplied(true)
    setTimeout(() => setJustApplied(false), 2000)
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
        <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('availability.rules.title')}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {t('availability.rules.subtitle')}
        </p>

        {/* Day selector */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 block mb-2">{t('availability.rules.daysLabel')}</label>
          <div className="flex gap-1.5">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                title={day.fullLabel}
                onClick={() => toggleDay(day.value)}
                className={clsx(
                  'w-9 h-9 rounded-full text-xs font-semibold transition-colors',
                  selectedDays.includes(day.value)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
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
            <label className="text-xs font-medium text-gray-600 block mb-1">{t('availability.rules.fromLabel')}</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={session?.dayStartTime}
              max={session?.dayEndTime}
              className="w-full rounded-md border border-gray-300 bg-white text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">{t('availability.rules.toLabel')}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={session?.dayStartTime}
              max={session?.dayEndTime}
              className="w-full rounded-md border border-gray-300 bg-white text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        {justApplied ? (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 text-xs font-semibold">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('availability.rules.applied')}
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleApply}
          >
            {t('availability.rules.applyButton')}
          </Button>
        )}
      </div>

      {/* Active rules list */}
      {rules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('availability.rules.activeRules', { count: rules.length })}
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              {t('common.clearAll')}
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-2 bg-teal-50 border border-teal-200 rounded-md px-2.5 py-1.5"
              >
                <span className="text-xs text-teal-800 font-medium flex-1 min-w-0 truncate">
                  {formatRuleLabel(rule, fullDays)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="shrink-0 text-teal-400 hover:text-red-500 transition-colors"
                  title={t('availability.rules.deleteRule')}
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

      {rules.length === 0 && !justApplied && (
        <div className="text-center py-3 text-xs text-gray-400">
          {t('availability.rules.noRules')}
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">{t('availability.legend.title')}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-teal-200 border border-teal-300 shrink-0" />
            <span className="text-xs text-gray-500">{t('availability.legend.fromRule')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-indigo-400 border border-indigo-500 shrink-0" />
            <span className="text-xs text-gray-500">{t('availability.legend.manual')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-white border border-gray-200 shrink-0" />
            <span className="text-xs text-gray-500">{t('availability.legend.unavailable')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
