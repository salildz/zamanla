import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrBefore)

// Generate all time slots for a session
export function generateSessionSlots(session) {
  const { dateStart, dateEnd, slotMinutes, dayStartTime, dayEndTime, includeWeekends, timezone: tz } = session
  const slots = []

  let currentDay = dayjs.tz(dateStart, tz).startOf('day')
  const lastDay = dayjs.tz(dateEnd, tz).startOf('day')

  while (currentDay.isSameOrBefore(lastDay, 'day')) {
    const dow = currentDay.day() // 0=Sun, 6=Sat
    if (!includeWeekends && (dow === 0 || dow === 6)) {
      currentDay = currentDay.add(1, 'day')
      continue
    }

    const [sh, sm] = dayStartTime.split(':').map(Number)
    const [eh, em] = dayEndTime.split(':').map(Number)

    let slotTime = currentDay.hour(sh).minute(sm).second(0).millisecond(0)
    const dayEndMoment = currentDay.hour(eh).minute(em).second(0).millisecond(0)

    while (slotTime.isBefore(dayEndMoment)) {
      const slotEnd = slotTime.add(slotMinutes, 'minute')
      if (slotEnd.isAfter(dayEndMoment)) break
      slots.push({
        slotStart: slotTime.utc().toISOString(),
        slotEnd: slotEnd.utc().toISOString(),
      })
      slotTime = slotEnd
    }

    currentDay = currentDay.add(1, 'day')
  }

  return slots
}

// Check if a slot matches a recurring rule
export function slotMatchesRule(slotStart, rule, tz) {
  const zonedTime = dayjs(slotStart).tz(tz)
  const dow = zonedTime.day()
  if (!rule.weekdays.includes(dow)) return false

  const timeStr = zonedTime.format('HH:mm')
  return timeStr >= rule.startTime && timeStr < rule.endTime
}

// Apply rules to generate a set of available slotStart ISOs
export function applyRulesToSlots(session, rules) {
  const allSlots = generateSessionSlots(session)
  const available = new Set()

  for (const slot of allSlots) {
    for (const rule of rules) {
      if (slotMatchesRule(slot.slotStart, rule, session.timezone)) {
        available.add(slot.slotStart)
        break
      }
    }
  }

  return available
}

// Format slot time for display in a timezone
export function formatSlotTime(isoString, tz) {
  return dayjs(isoString).tz(tz).format('HH:mm')
}

// Format date for column header
export function formatSlotDate(isoString, tz) {
  return dayjs(isoString).tz(tz).format('ddd D MMM')
}

// Format date short for narrow columns
export function formatSlotDateShort(isoString, tz) {
  return dayjs(isoString).tz(tz).format('D/M')
}

// Get just the date key for grouping
export function getDateKey(isoString, tz) {
  return dayjs(isoString).tz(tz).format('YYYY-MM-DD')
}

// Group slots by date for grid display
export function groupSlotsByDate(slots, tz) {
  const groups = {}
  for (const slot of slots) {
    const dateKey = getDateKey(slot.slotStart, tz)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(slot)
  }
  return groups
}

// Get unique time labels (HH:mm) from a list of slots
export function getTimeLabels(slots, tz) {
  const seen = new Set()
  const labels = []
  for (const slot of slots) {
    const time = formatSlotTime(slot.slotStart, tz)
    if (!seen.has(time)) {
      seen.add(time)
      labels.push(time)
    }
  }
  return labels
}

// Build a lookup map: dateKey -> timeLabel -> slotStart ISO
export function buildSlotLookup(slots, tz) {
  const lookup = {}
  for (const slot of slots) {
    const dateKey = getDateKey(slot.slotStart, tz)
    const timeLabel = formatSlotTime(slot.slotStart, tz)
    if (!lookup[dateKey]) lookup[dateKey] = {}
    lookup[dateKey][timeLabel] = slot.slotStart
  }
  return lookup
}

// Format a date range nicely
export function formatDateRange(dateStart, dateEnd, tz) {
  const start = dayjs.tz(dateStart, tz)
  const end = dayjs.tz(dateEnd, tz)
  if (start.year() === end.year()) {
    return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`
  }
  return `${start.format('D MMM YYYY')} – ${end.format('D MMM YYYY')}`
}

// Compute heatmap color (returns a CSS color string) based on ratio 0..1
export function heatmapColor(ratio) {
  if (ratio <= 0) return '#f9fafb' // gray-50
  // Interpolate from #d1fae5 (emerald-100) to #059669 (emerald-600)
  const r = Math.round(209 + (5 - 209) * ratio)
  const g = Math.round(250 + (150 - 250) * ratio)
  const b = Math.round(229 + (105 - 229) * ratio)
  return `rgb(${r},${g},${b})`
}
