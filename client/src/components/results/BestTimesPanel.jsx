import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

function formatDateTime(isoString, tz) {
  return dayjs(isoString).tz(tz).format('ddd, D MMM · HH:mm')
}

function formatTimeRange(start, end, tz) {
  const s = dayjs(start).tz(tz).format('HH:mm')
  const e = dayjs(end).tz(tz).format('HH:mm')
  return `${s} – ${e}`
}

function formatDate(isoString, tz) {
  return dayjs(isoString).tz(tz).format('ddd, D MMM')
}

// Group consecutive best slots into blocks
function groupConsecutiveSlots(topSlots, tz) {
  if (!topSlots || topSlots.length === 0) return []

  // Sort by availableCount desc, then by time
  const sorted = [...topSlots].sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount
    return new Date(a.slotStart) - new Date(b.slotStart)
  })

  return sorted.slice(0, 10)
}

export default function BestTimesPanel({ results, session, onHighlight, highlightedSlots }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(null)
  const tz = session?.timezone || 'UTC'

  if (!results || results.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('results.bestTimes.title')}</h3>
        <div className="text-center py-6 text-gray-400 text-sm">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t('results.bestTimes.noResponses')}
        </div>
      </div>
    )
  }

  // Filter to slots with at least 1 person available
  const slotsWithAvailability = results.filter((r) => r.availableCount > 0)
  const topSlots = groupConsecutiveSlots(slotsWithAvailability, tz).slice(0, 5)
  const maxCount = topSlots[0]?.availableCount || 1
  const totalParticipants = results[0]?.totalParticipants || 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{t('results.bestTimes.topTitle')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('results.bestTimes.topSubtitle')}
        </p>
      </div>

      {topSlots.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          {t('results.bestTimes.noOverlap')}
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {topSlots.map((slot, idx) => {
            const ratio = totalParticipants > 0 ? slot.availableCount / totalParticipants : 0
            const isExpanded = expanded === slot.slotStart
            const isHighlighted = highlightedSlots?.has(slot.slotStart)

            return (
              <li key={slot.slotStart}>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(isExpanded ? null : slot.slotStart)
                    onHighlight?.(isExpanded ? null : slot.slotStart)
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50',
                    isExpanded && 'bg-indigo-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Rank badge */}
                    <div
                      className={clsx(
                        'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        idx === 0
                          ? 'bg-emerald-600 text-white'
                          : idx === 1
                          ? 'bg-emerald-400 text-white'
                          : idx === 2
                          ? 'bg-emerald-300 text-white'
                          : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatDate(slot.slotStart, tz)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeRange(slot.slotStart, slot.slotEnd, tz)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-emerald-700">
                            {slot.availableCount}
                          </span>
                          <span className="text-xs text-gray-400">
                            /{totalParticipants}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded participants list */}
                  {isExpanded && slot.participants && slot.participants.length > 0 && (
                    <div className="mt-3 ml-9">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">
                        {t('results.bestTimes.availableParticipants')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {slot.participants.map((p, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-100"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {totalParticipants === 0 && (
        <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 text-center">
          {t('results.bestTimes.shareHint')}
        </div>
      )}
    </div>
  )
}
