import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  groupSlotsByDate,
  getTimeLabels,
  buildSlotLookup,
  formatSlotDate,
  formatSlotTime,
} from '../../utils/slotUtils.js'

// A single grid cell — memoized to prevent re-renders during drag
const GridCell = memo(function GridCell({
  slotStart,
  tz,
  isAvailable,
  isManual,
  isDragging,
  dragValue,
  onMouseDown,
  onTouchStart,
}) {
  const draggingAdd = isDragging && dragValue
  const draggingRemove = isDragging && !dragValue

  return (
    <td
      data-slot={slotStart || undefined}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={clsx(
        'grid-cell border border-gray-100',
        draggingAdd && 'bg-indigo-300',
        draggingRemove && 'bg-gray-100',
        !isDragging && isManual && 'grid-cell-manual',
        !isDragging && !isManual && isAvailable && 'grid-cell-rule',
        !isDragging && !isAvailable && 'grid-cell-empty'
      )}
      title={slotStart ? formatSlotTime(slotStart, tz) : ''}
    />
  )
})

export default function AvailabilityGrid({
  session,
  slots,
  availability,
  manualOverrides,
  onToggle,
  onDragSelect,
}) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(true)
  const [draggedSlots, setDraggedSlots] = useState(new Set())

  // Refs for reliable access inside document event listeners — avoids stale closures entirely
  const isDraggingRef = useRef(false)
  const dragValueRef = useRef(true)
  const draggedSlotsRef = useRef(new Set())
  const onDragSelectRef = useRef(onDragSelect)
  useEffect(() => { onDragSelectRef.current = onDragSelect }, [onDragSelect])

  const tz = session?.timezone || 'UTC'
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
    (dateKey, timeLabel) => slotLookup[dateKey]?.[timeLabel] || null,
    [slotLookup]
  )

  // Add a slot to the drag selection — reads from refs, never stale
  const addSlotToDrag = useCallback((slotStart) => {
    if (!isDraggingRef.current || !slotStart) return
    if (draggedSlotsRef.current.has(slotStart)) return
    draggedSlotsRef.current.add(slotStart)
    setDraggedSlots((prev) => {
      const next = new Set(prev)
      next.add(slotStart)
      return next
    })
    onDragSelectRef.current([slotStart], dragValueRef.current)
  }, [])

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    draggedSlotsRef.current = new Set()
    setIsDragging(false)
    setDraggedSlots(new Set())
  }, [])

  // Document-level move tracking — elementFromPoint is reliable at any speed,
  // unlike mouseenter which skips cells when the pointer moves quickly
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const slotStart = el?.getAttribute('data-slot')
      if (slotStart) addSlotToDrag(slotStart)
    }

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current) return
      // Prevent page scroll while the user is dragging to select cells
      e.preventDefault()
      const touch = e.touches[0]
      if (!touch) return
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const slotStart = el?.getAttribute('data-slot')
      if (slotStart) addSlotToDrag(slotStart)
    }

    document.addEventListener('mousemove', handleMouseMove)
    // passive: false is required so we can call e.preventDefault() in touchmove
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('mouseup', endDrag)
    document.addEventListener('touchend', endDrag)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', endDrag)
      document.removeEventListener('touchend', endDrag)
    }
  }, [addSlotToDrag, endDrag])

  const handleMouseDown = useCallback(
    (slotStart) => (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      if (!slotStart) return
      const newValue = !availability.has(slotStart)
      isDraggingRef.current = true
      dragValueRef.current = newValue
      draggedSlotsRef.current = new Set([slotStart])
      setIsDragging(true)
      setDragValue(newValue)
      setDraggedSlots(new Set([slotStart]))
      onToggle(slotStart)
    },
    [availability, onToggle]
  )

  const handleTouchStart = useCallback(
    (slotStart) => (e) => {
      if (!slotStart) return
      e.preventDefault()
      const newValue = !availability.has(slotStart)
      isDraggingRef.current = true
      dragValueRef.current = newValue
      draggedSlotsRef.current = new Set([slotStart])
      setIsDragging(true)
      setDragValue(newValue)
      setDraggedSlots(new Set([slotStart]))
      onToggle(slotStart)
    },
    [availability, onToggle]
  )

  if (!slots || slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        {t('availability.grid.noSlots')}
      </div>
    )
  }

  return (
    <div>
      {dates.length > 4 && (
        <p className="text-xs text-gray-400 text-center mb-1 sm:hidden select-none">
          {t('availability.grid.scrollHint')}
        </p>
      )}
      <div className="availability-grid-container scrollbar-thin select-none">
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
                      tz={tz}
                      isAvailable={available}
                      isManual={manual}
                      isDragging={draggingThisSlot}
                      dragValue={dragValue}
                      onMouseDown={handleMouseDown(slotStart)}
                      onTouchStart={handleTouchStart(slotStart)}
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
