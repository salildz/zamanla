import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  groupSlotsByDate,
  getTimeLabels,
  buildSlotLookup,
  formatSlotDate,
  formatSlotTime,
} from '../../utils/slotUtils.js'

// A single grid cell — memoized to prevent re-renders during drag.
// Handlers are passed as stable refs so memo is not defeated.
const GridCell = memo(function GridCell({
  slotStart,
  tz,
  isAvailable,
  manualStatus,
  isDragging,
  dragValue,
  selectionMode,
  onMouseDown,
  onTouchStart,
  onClick,
  onKeyDown,
}) {
  const draggingAdd = isDragging && dragValue
  const draggingRemove = isDragging && !dragValue
  const isManualAvailable = manualStatus === 'available'
  const isManualUnavailable = manualStatus === 'unavailable'

  return (
    <td
      data-slot={slotStart || undefined}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={slotStart ? 0 : -1}
      aria-pressed={slotStart ? isAvailable : undefined}
      className={clsx(
        'grid-cell border border-gray-100',
        selectionMode && 'grid-cell-selecting',
        draggingAdd && 'bg-indigo-300',
        draggingRemove && 'bg-gray-100',
        !isDragging && isManualAvailable && 'grid-cell-manual',
        !isDragging && isManualUnavailable && 'grid-cell-manual-unavailable',
        !isDragging && !isManualAvailable && !isManualUnavailable && isAvailable && 'grid-cell-rule',
        !isDragging && !isManualAvailable && !isManualUnavailable && !isAvailable && 'grid-cell-empty'
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
  selectionMode = true,
}) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(true)
  const [draggedSlots, setDraggedSlots] = useState(new Set())

  // Refs for reliable access inside document event listeners — avoids stale closures
  const isDraggingRef = useRef(false)
  const dragValueRef = useRef(true)
  const draggedSlotsRef = useRef(new Set())
  const onDragSelectRef = useRef(onDragSelect)
  const onToggleRef = useRef(onToggle)
  const availabilityRef = useRef(availability)
  const selectionModeRef = useRef(selectionMode)

  // Keep refs in sync with latest props without re-creating callbacks
  useEffect(() => { onDragSelectRef.current = onDragSelect }, [onDragSelect])
  useEffect(() => { onToggleRef.current = onToggle }, [onToggle])
  useEffect(() => { availabilityRef.current = availability }, [availability])
  useEffect(() => { selectionModeRef.current = selectionMode }, [selectionMode])

  const tz = session?.timezone || 'UTC'

  // Memoize derived slot data — only recomputes when slots/tz change
  const { slotsByDate, dates, timeLabels, slotLookup } = useMemo(() => {
    const slotsByDate = groupSlotsByDate(slots, tz)
    const dates = Object.keys(slotsByDate).sort()
    const timeLabels = getTimeLabels(slots, tz)
    const slotLookup = buildSlotLookup(slots, tz)
    return { slotsByDate, dates, timeLabels, slotLookup }
  }, [slots, tz])

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

  // Document-level move tracking — elementFromPoint is reliable at any speed
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const slotStart = el?.getAttribute('data-slot')
      if (slotStart) addSlotToDrag(slotStart)
    }

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      const touch = e.touches[0]
      if (!touch) return
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const slotStart = el?.getAttribute('data-slot')
      if (slotStart) addSlotToDrag(slotStart)
    }

    document.addEventListener('mousemove', handleMouseMove)
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

  // Stable handlers — read slotStart from data-slot attribute, availability from ref.
  // This means GridCell memoization is never defeated by prop churn.
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const slotStart = e.currentTarget.dataset.slot
    if (!slotStart) return
    e.preventDefault()
    const newValue = !availabilityRef.current.has(slotStart)
    isDraggingRef.current = true
    dragValueRef.current = newValue
    draggedSlotsRef.current = new Set([slotStart])
    setIsDragging(true)
    setDragValue(newValue)
    setDraggedSlots(new Set([slotStart]))
    onToggleRef.current(slotStart)
  }, [])

  const handleTouchStart = useCallback((e) => {
    if (!selectionModeRef.current) return
    const slotStart = e.currentTarget.dataset.slot
    if (!slotStart) return
    e.preventDefault()
    const newValue = !availabilityRef.current.has(slotStart)
    isDraggingRef.current = true
    dragValueRef.current = newValue
    draggedSlotsRef.current = new Set([slotStart])
    setIsDragging(true)
    setDragValue(newValue)
    setDraggedSlots(new Set([slotStart]))
    onToggleRef.current(slotStart)
  }, [])

  const handleClick = useCallback((e) => {
    // In scroll mode, a simple tap should still toggle a slot.
    if (selectionModeRef.current) return
    const slotStart = e.currentTarget.dataset.slot
    if (!slotStart) return
    onToggleRef.current(slotStart)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const slotStart = e.currentTarget.dataset.slot
    if (!slotStart) return
    e.preventDefault()
    onToggleRef.current(slotStart)
  }, [])

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
                  const slotStart = slotLookup[dateKey]?.[timeLabel] || null
                  if (!slotStart) {
                    return (
                      <td
                        key={dateKey}
                        className="grid-cell border border-gray-100 bg-gray-50 cursor-not-allowed"
                      />
                    )
                  }

                  const available = availability.has(slotStart)
                  const manualStatus = manualOverrides[slotStart]
                  const draggingThisSlot = draggedSlots.has(slotStart)

                  return (
                    <GridCell
                      key={dateKey}
                      slotStart={slotStart}
                      tz={tz}
                      isAvailable={available}
                      manualStatus={manualStatus}
                      isDragging={draggingThisSlot}
                      dragValue={dragValue}
                      selectionMode={selectionMode}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      onClick={handleClick}
                      onKeyDown={handleKeyDown}
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
