import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrBefore)

// Generate all time slots for a session.
// Must stay byte-for-byte in sync with the server generator (timeUtils.js):
// results are joined on the exact slotStart ISO timestamp, so any divergence
// (e.g. across a DST transition) silently drops that day's availability.
export function generateSessionSlots(session) {
  const { dateStart, dateEnd, slotMinutes, dayStartTime, dayEndTime, includeWeekends, timezone: tz } = session
  const slots = []

  // Normalize the daily window to HH:MM (the API may send "HH:MM:SS")
  const startHM = String(dayStartTime).substring(0, 5)
  const endHM = String(dayEndTime).substring(0, 5)

  // Iterate calendar days in UTC so the day-stepping is never perturbed by DST.
  // For each date, resolve the wall-clock window *in the session timezone* — this
  // picks the correct UTC offset even on a DST-transition day, matching the server.
  const cursor = new Date(`${dateStart}T00:00:00Z`)
  const lastDate = new Date(`${dateEnd}T00:00:00Z`)

  while (cursor <= lastDate) {
    const dateStr = cursor.toISOString().substring(0, 10)
    const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay() // calendar weekday (0=Sun, 6=Sat)

    if (includeWeekends || (dow !== 0 && dow !== 6)) {
      let slotStart = dayjs.tz(`${dateStr}T${startHM}`, tz)
      const dayEnd = dayjs.tz(`${dateStr}T${endHM}`, tz)

      while (slotStart.isBefore(dayEnd)) {
        const slotEnd = slotStart.add(slotMinutes, 'minute')
        if (slotEnd.isAfter(dayEnd)) break
        slots.push({
          slotStart: slotStart.utc().toISOString(),
          slotEnd: slotEnd.utc().toISOString(),
        })
        slotStart = slotEnd
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
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

// Compute heatmap color (returns a CSS color string) based on ratio 0..1.
// "Forest + harvest" theme: warm-sand empty cell, ramping from pale amber up to
// deep harvest amber as more people are available.
export function heatmapColor(ratio) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0))

  if (safeRatio <= 0) {
    return '#fbf6ec'
  }

  // Interpolate pale amber (#F2E1B6) -> deep amber (#8A5A12).
  const start = { r: 242, g: 225, b: 182 }
  const end = { r: 138, g: 90, b: 18 }

  const r = Math.round(start.r + (end.r - start.r) * safeRatio)
  const g = Math.round(start.g + (end.g - start.g) * safeRatio)
  const b = Math.round(start.b + (end.b - start.b) * safeRatio)
  return `rgb(${r},${g},${b})`
}

// Readable text color for a heatmap count overlaid on heatmapColor(ratio).
export function heatmapTextColor(ratio) {
  const safeRatio = Math.max(0, Math.min(1, ratio || 0))
  return safeRatio >= 0.5 ? '#fcf9f3' : '#4a3206'
}
