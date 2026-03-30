import { useState, useCallback, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  groupSlotsByDate,
  getTimeLabels,
  buildSlotLookup,
  formatSlotDate,
  formatSlotTime,
  heatmapColor,
} from '../../utils/slotUtils.js'

// Desktop hover tooltip — hidden on small screens, shown only on sm+
function CellTooltip({ slot, tz }) {
  const { t } = useTranslation()
  if (!slot) return null
  const { availableCount, totalParticipants, participants, slotStart, slotEnd } = slot
  const ratio = totalParticipants > 0 ? availableCount / totalParticipants : 0

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none hidden sm:block">
      <div className="bg-gray-900 text-white text-xs rounded-md shadow-lg px-3 py-2 min-w-[140px] max-w-[200px]">
        <div className="font-semibold mb-1">
          {formatSlotTime(slotStart, tz)} – {formatSlotTime(slotEnd, tz)}
        </div>
        <div className="text-gray-300 mb-1.5">
          {t('results.tooltip.available', { available: availableCount, total: totalParticipants })}
          {totalParticipants > 0 && (
            <span className="ml-1 text-emerald-400">({Math.round(ratio * 100)}%)</span>
          )}
        </div>
        {participants && participants.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {participants.slice(0, 8).map((p, i) => (
              <span key={i} className="text-gray-200">· {p.name}</span>
            ))}
            {participants.length > 8 && (
              <span className="text-gray-400">{t('results.tooltip.more', { count: participants.length - 8 })}</span>
            )}
          </div>
        )}
        {(!participants || participants.length === 0) && availableCount === 0 && (
          <span className="text-gray-400">{t('results.tooltip.noOneAvailable')}</span>
        )}
      </div>
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
      </div>
    </div>
  )
}

// Persistent slot detail panel — shown below the grid when a slot is tapped/clicked
function SlotDetailCard({ slot, tz, onClose }) {
  const { t } = useTranslation()
  if (!slot) return null
  const { availableCount, totalParticipants, participants, slotStart, slotEnd } = slot

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">
            {formatSlotDate(slotStart, tz)}
          </p>
          <p className="font-semibold text-gray-800 text-sm">
            {formatSlotTime(slotStart, tz)} – {formatSlotTime(slotEnd, tz)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('results.tooltip.available', { available: availableCount, total: totalParticipants })}
            {totalParticipants > 0 && availableCount > 0 && (
              <span className="ml-1 text-emerald-600 font-medium">
                ({Math.round((availableCount / totalParticipants) * 100)}%)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 p-1 -m-1 rounded"
          aria-label={t('common.dismiss')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {availableCount > 0 && participants && participants.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {participants.slice(0, 14).map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium border border-emerald-100"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {p.name}
            </span>
          ))}
          {participants.length > 14 && (
            <span className="text-xs text-gray-400 self-center">
              {t('results.tooltip.more', { count: participants.length - 14 })}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">{t('results.tooltip.noOneAvailable')}</p>
      )}
    </div>
  )
}

const HeatmapCell = memo(function HeatmapCell({ resultSlot, tz, isHighlighted, isSelected, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!resultSlot) {
    return <td className="heatmap-cell heatmap-cell-empty" />
  }

  const { availableCount, totalParticipants } = resultSlot
  const ratio = totalParticipants > 0 ? availableCount / totalParticipants : 0
  const bgColor = heatmapColor(ratio)

  return (
    <td
      className={clsx(
        'heatmap-cell border relative',
        ratio > 0 ? 'heatmap-cell-active' : 'heatmap-cell-idle',
        isHighlighted && 'ring-2 ring-inset ring-indigo-500',
        isSelected && 'ring-2 ring-inset ring-indigo-600 brightness-90'
      )}
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
    >
      {ratio > 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-xs font-semibold text-emerald-800 opacity-85 pointer-events-none select-none">
          {availableCount}
        </span>
      )}
      {showTooltip && <CellTooltip slot={resultSlot} tz={tz} />}
    </td>
  )
})

export default function ResultsHeatmap({ session, slots, results, highlightedSlots }) {
  const { t } = useTranslation()
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showOnlyAvailableRows, setShowOnlyAvailableRows] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  )
  const tz = session?.timezone || 'UTC'

  const resultLookup = useMemo(() => {
    const lookup = {}
    if (results) {
      for (const r of results) {
        lookup[r.slotStart] = r
      }
    }
    return lookup
  }, [results])

  const slotsByDate = groupSlotsByDate(slots, tz)
  const dates = Object.keys(slotsByDate).sort()
  const timeLabels = getTimeLabels(slots, tz)
  const slotLookup = buildSlotLookup(slots, tz)
  const visibleTimeLabels = useMemo(() => {
    if (!showOnlyAvailableRows) return timeLabels
    return timeLabels.filter((timeLabel) => {
      return dates.some((dateKey) => {
        const slotStart = slotLookup[dateKey]?.[timeLabel]
        if (!slotStart) return false
        return (resultLookup[slotStart]?.availableCount || 0) > 0
      })
    })
  }, [showOnlyAvailableRows, timeLabels, dates, slotLookup, resultLookup])

  const totalParticipants =
    results && results.length > 0 ? results[0].totalParticipants : 0

  const handleCellClick = useCallback((slotStart) => {
    setSelectedSlot((prev) => (prev === slotStart ? null : slotStart))
  }, [])

  if (!slots || slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        {t('results.noSlots')}
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">{t('results.noData')}</p>
      </div>
    )
  }

  const selectedSlotData = selectedSlot ? resultLookup[selectedSlot] : null

  return (
    <div className="flex flex-col gap-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
        <span>{t('results.participantCount', { count: totalParticipants })}</span>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">{t('results.lessAvailable')}</span>
          <div className="flex gap-px">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
              <span
                key={r}
                className="w-4 h-4 rounded-sm border border-gray-200"
                style={{ backgroundColor: heatmapColor(r) }}
              />
            ))}
          </div>
          <span className="text-gray-500">{t('results.moreAvailable')}</span>
        </div>
      </div>

      {/* Mobile interaction hint */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-gray-400 sm:hidden">{t('results.tapHint')}</p>
        <button
          type="button"
          onClick={() => setShowOnlyAvailableRows((v) => !v)}
          className="w-full sm:w-auto min-h-[40px] text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors"
        >
          {showOnlyAvailableRows
            ? t('results.filters.showAllRows')
            : t('results.filters.showOnlyAvailableRows')}
        </button>
      </div>

      {showOnlyAvailableRows && visibleTimeLabels.length === 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          {t('results.filters.noAvailableRows')}
        </div>
      )}

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
            {visibleTimeLabels.map((timeLabel) => (
              <tr key={timeLabel}>
                <td className="grid-time-label border border-gray-100 sticky left-0 z-10 bg-white">
                  {timeLabel}
                </td>
                {dates.map((dateKey) => {
                  const slotStart = slotLookup[dateKey]?.[timeLabel]
                  const resultSlot = slotStart ? resultLookup[slotStart] : null
                  const isHighlighted = highlightedSlots ? highlightedSlots.has(slotStart) : false
                  const isSelected = slotStart === selectedSlot

                  return (
                    <HeatmapCell
                      key={dateKey}
                      resultSlot={resultSlot}
                      tz={tz}
                      isHighlighted={isHighlighted}
                      isSelected={isSelected}
                      onClick={slotStart ? () => handleCellClick(slotStart) : undefined}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slot detail card — shown when a cell is tapped/clicked */}
      {selectedSlot && selectedSlotData && (
        <SlotDetailCard
          slot={selectedSlotData}
          tz={tz}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  )
}
