import { useState, useEffect, useCallback, useRef, memo } from 'react'
import clsx from 'clsx'
import {
  groupSlotsByDate,
  getTimeLabels,
  buildSlotLookup,
  formatSlotDate,
  formatSlotTime,
} from '../../utils/slotUtils.js'

// A single grid cell — memoized for performance
const GridCell = memo(function GridCell({
  slotStart,
  isAvailable,
  isManual,
  isDragging,
  dragValue,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  onTouchMove,
}) {
  const draggingAdd = isDragging && dragValue
  const draggingRemove = isDragging && !dragValue

  return (
    <td
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      className={clsx(
        'grid-cell border border-gray-100',
        draggingAdd && 'bg-indigo-300',
        draggingRemove && 'bg-gray-100',
        !isDragging && isManual && 'grid-cell-manual',
        !isDragging && !isManual && isAvailable && 'grid-cell-rule',
        !isDragging && !isAvailable && 'grid-cell-empty'
      )}
      title={slotStart ? formatSlotTime(slotStart, null) : ''}
    />
  )
})

export default function AvailabilityGrid({
  session,
  slots,
  availability,      // Set of slotStart ISOs that are available
  manualOverrides,   // { slotStart: 'available' | 'unavailable' }
  onToggle,
  onDragSelect,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(true)
  const [draggedSlots, setDraggedSlots] = useState(new Set())
  const containerRef = useRef(null)

  const tz = session?.timezone || 'UTC'

  // Build grid data structures
  const slotsByDate = groupSlotsByDate(slots, tz)
  const dates = Object.keys(slotsByDate).sort()
  const timeLabels = getTimeLabels(slots, tz)
  const slotLookup = buildSlotLookup(slots, tz)

  const isSlotAvailable = useCallback(
    (slotStart) => {
      if (!slotStart) return false
      return availability.has(slotStart)
    },
    [availability]
  )

  const isManualOverride = useCallback(
    (slotStart) => {
      if (!slotStart) return false
      return manualOverrides[slotStart] !== undefined
    },
    [manualOverrides]
  )

  const getSlotStart = useCallback(
    (dateKey, timeLabel) => {
      return slotLookup[dateKey]?.[timeLabel] || null
    },
    [slotLookup]
  )

  // Mouse handlers
  const handleMouseDown = useCallback(
    (slotStart) => (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      if (!slotStart) return

      const currentlyAvailable = availability.has(slotStart)
      const newValue = !currentlyAvailable

      setIsDragging(true)
      setDragValue(newValue)
      setDraggedSlots(new Set([slotStart]))
      onToggle(slotStart)
    },
    [availability, onToggle]
  )

  const handleMouseEnter = useCallback(
    (slotStart) => () => {
      if (!isDragging || !slotStart) return
      if (draggedSlots.has(slotStart)) return

      setDraggedSlots((prev) => new Set([...prev, slotStart]))
      onDragSelect([slotStart], dragValue)
    },
    [isDragging, dragValue, draggedSlots, onDragSelect]
  )

  // Touch support
  const handleTouchStart = useCallback(
    (slotStart) => (e) => {
      if (!slotStart) return
      e.preventDefault()
      const currentlyAvailable = availability.has(slotStart)
      const newValue = !currentlyAvailable
      setIsDragging(true)
      setDragValue(newValue)
      setDraggedSlots(new Set([slotStart]))
      onToggle(slotStart)
    },
    [availability, onToggle]
  )

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging) return
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (!el) return
      const slotStart = el.getAttribute('data-slot')
      if (!slotStart || draggedSlots.has(slotStart)) return
      setDraggedSlots((prev) => new Set([...prev, slotStart]))
      onDragSelect([slotStart], dragValue)
    },
    [isDragging, dragValue, draggedSlots, onDragSelect]
  )

  const endDrag = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDraggedSlots(new Set())
    }
  }, [isDragging])

  useEffect(() => {
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchend', endDrag)
    return () => {
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchend', endDrag)
    }
  }, [endDrag])

  if (!slots || slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No time slots available for this session.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="availability-grid-container scrollbar-thin select-none"
      onMouseLeave={endDrag}
    >
      <table className="availability-grid-table">
        <thead>
          <tr>
            {/* Corner cell */}
            <th className="grid-corner-header border border-gray-100 sticky top-0 left-0 z-30 bg-white" />
            {/* Date headers */}
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
              {/* Time label (sticky left) */}
              <td className="grid-time-label border border-gray-100 sticky left-0 z-10 bg-white">
                {timeLabel}
              </td>
              {/* Cells */}
              {dates.map((dateKey) => {
                const slotStart = getSlotStart(dateKey, timeLabel)
                if (!slotStart) {
                  return (
                    <td
                      key={dateKey}
                      className="grid-cell border border-gray-100 bg-gray-50 cursor-not-allowed"
                    />
                  )
                }

                const available = isSlotAvailable(slotStart)
                const manual = isManualOverride(slotStart)
                const draggingThisSlot = draggedSlots.has(slotStart)

                return (
                  <GridCell
                    key={dateKey}
                    slotStart={slotStart}
                    isAvailable={available}
                    isManual={manual}
                    isDragging={draggingThisSlot}
                    dragValue={dragValue}
                    onMouseDown={handleMouseDown(slotStart)}
                    onMouseEnter={handleMouseEnter(slotStart)}
                    onTouchStart={handleTouchStart(slotStart)}
                    onTouchMove={handleTouchMove}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
