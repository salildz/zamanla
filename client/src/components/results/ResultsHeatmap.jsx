import { useState, useCallback, memo } from 'react'
import clsx from 'clsx'
import {
  groupSlotsByDate,
  getTimeLabels,
  buildSlotLookup,
  formatSlotDate,
  formatSlotTime,
  heatmapColor,
} from '../../utils/slotUtils.js'

// Tooltip for a heatmap cell
function CellTooltip({ slot, tz }) {
  if (!slot) return null
  const { availableCount, totalParticipants, participants, slotStart, slotEnd } = slot
  const ratio = totalParticipants > 0 ? availableCount / totalParticipants : 0

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none">
      <div className="bg-gray-900 text-white text-xs rounded-md shadow-lg px-3 py-2 min-w-[140px] max-w-[200px]">
        <div className="font-semibold mb-1">
          {formatSlotTime(slotStart, tz)} – {formatSlotTime(slotEnd, tz)}
        </div>
        <div className="text-gray-300 mb-1.5">
          {availableCount} / {totalParticipants} available
          {totalParticipants > 0 && (
            <span className="ml-1 text-emerald-400">({Math.round(ratio * 100)}%)</span>
          )}
        </div>
        {participants && participants.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {participants.slice(0, 8).map((p, i) => (
              <span key={i} className="text-gray-200">
                · {p.name}
              </span>
            ))}
            {participants.length > 8 && (
              <span className="text-gray-400">+{participants.length - 8} more</span>
            )}
          </div>
        )}
        {(!participants || participants.length === 0) && availableCount === 0 && (
          <span className="text-gray-400">No one available</span>
        )}
      </div>
      {/* Tooltip arrow */}
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
      </div>
    </div>
  )
}

const HeatmapCell = memo(function HeatmapCell({ resultSlot, tz, isHighlighted }) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!resultSlot) {
    return (
      <td className="heatmap-cell border border-gray-100 bg-gray-50" />
    )
  }

  const { availableCount, totalParticipants } = resultSlot
  const ratio = totalParticipants > 0 ? availableCount / totalParticipants : 0
  const bgColor = heatmapColor(ratio)

  return (
    <td
      className={clsx(
        'heatmap-cell border relative',
        ratio > 0 ? 'border-emerald-100' : 'border-gray-100',
        isHighlighted && 'ring-2 ring-inset ring-indigo-500'
      )}
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {ratio > 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-emerald-800 opacity-80 pointer-events-none">
          {availableCount > 0 ? availableCount : ''}
        </span>
      )}
      {showTooltip && <CellTooltip slot={resultSlot} tz={tz} />}
    </td>
  )
})

export default function ResultsHeatmap({ session, slots, results, highlightedSlots }) {
  const tz = session?.timezone || 'UTC'

  // Build a lookup from slotStart → result
  const resultLookup = {}
  if (results) {
    for (const r of results) {
      resultLookup[r.slotStart] = r
    }
  }

  const slotsByDate = groupSlotsByDate(slots, tz)
  const dates = Object.keys(slotsByDate).sort()
  const timeLabels = getTimeLabels(slots, tz)
  const slotLookup = buildSlotLookup(slots, tz)

  const totalParticipants =
    results && results.length > 0 ? results[0].totalParticipants : 0

  if (!slots || slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No time slots to display.
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">No availability data yet. Be the first to respond!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
        <span>
          <span className="font-semibold text-gray-800">{totalParticipants}</span>{' '}
          participant{totalParticipants !== 1 ? 's' : ''} responded
        </span>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Less available</span>
          <div className="flex gap-px">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
              <span
                key={r}
                className="w-4 h-4 rounded-sm border border-gray-200"
                style={{ backgroundColor: heatmapColor(r) }}
              />
            ))}
          </div>
          <span className="text-gray-500">More available</span>
        </div>
      </div>

      {/* Grid */}
      <div className="availability-grid-container scrollbar-thin">
        <table className="availability-grid-table">
          <thead>
            <tr>
              <th className="grid-corner-header border border-gray-100 sticky top-0 left-0 z-30 bg-white" />
              {dates.map((dateKey) => {
                const firstSlot = slotsByDate[dateKey]?.[0]
                return (
                  <th key={dateKey} className="grid-date-header border border-gray-100 sticky top-0 z-10 bg-gray-50">
                    <div className="flex flex-col items-center leading-tight">
                      {firstSlot ? (
                        <>
                          <span className="font-semibold text-gray-700">
                            {formatSlotDate(firstSlot.slotStart, tz).split(' ')[0]}
                          </span>
                          <span className="text-gray-500">
                            {formatSlotDate(firstSlot.slotStart, tz).split(' ').slice(1).join(' ')}
                          </span>
                        </>
                      ) : (
                        dateKey
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {timeLabels.map((timeLabel) => (
              <tr key={timeLabel}>
                <td className="grid-time-label border border-gray-100 sticky left-0 z-10 bg-white">
                  {timeLabel}
                </td>
                {dates.map((dateKey) => {
                  const slotStart = slotLookup[dateKey]?.[timeLabel]
                  const resultSlot = slotStart ? resultLookup[slotStart] : null
                  const isHighlighted = highlightedSlots
                    ? highlightedSlots.has(slotStart)
                    : false

                  return (
                    <HeatmapCell
                      key={dateKey}
                      resultSlot={resultSlot}
                      tz={tz}
                      isHighlighted={isHighlighted}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
