'use strict';

const { fromZonedTime, toZonedTime, format: tzFormat } = require('date-fns-tz');
const { addMinutes, parseISO, eachDayOfInterval, format } = require('date-fns');

function normalizeDateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().substring(0, 10);
  }
  return String(value).substring(0, 10);
}

/**
 * Generate all time slots for a session.
 *
 * @param {Object} session
 * @param {string} session.date_start - 'YYYY-MM-DD'
 * @param {string} session.date_end   - 'YYYY-MM-DD'
 * @param {number} session.slot_minutes
 * @param {string} session.day_start_time - 'HH:MM'
 * @param {string} session.day_end_time   - 'HH:MM'
 * @param {boolean} session.include_weekends
 * @param {string} session.timezone - IANA timezone string
 * @returns {{ slotStart: Date, slotEnd: Date }[]}
 */
function generateSessionSlots(session) {
  const {
    date_start,
    date_end,
    slot_minutes,
    day_start_time,
    day_end_time,
    include_weekends,
    timezone,
  } = session;

  // PostgreSQL TIME type returns "HH:MM:SS" — normalize to "HH:MM" to avoid
  // building an invalid datetime string like "09:00:00:00" that causes fromZonedTime
  // to return Invalid Date, which makes the while-loop condition false and produces [].
  const startTimeNorm = String(day_start_time).substring(0, 5);
  const endTimeNorm = String(day_end_time).substring(0, 5);

  const startDate = parseISO(normalizeDateOnly(date_start));
  const endDate = parseISO(normalizeDateOnly(date_end));

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const slots = [];

  for (const day of days) {
    const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
    if (!include_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    // Format the date as YYYY-MM-DD in UTC context (day is already a plain date)
    const dateStr = format(day, 'yyyy-MM-dd');

    // Build UTC instants for the start and end of operating hours in session timezone
    const currentSlotInit = fromZonedTime(`${dateStr}T${startTimeNorm}:00`, timezone);
    const dayEnd = fromZonedTime(`${dateStr}T${endTimeNorm}:00`, timezone);

    let currentSlot = currentSlotInit;

    while (currentSlot < dayEnd) {
      const slotEnd = addMinutes(currentSlot, slot_minutes);
      if (slotEnd > dayEnd) break;
      slots.push({ slotStart: currentSlot, slotEnd });
      currentSlot = slotEnd;
    }
  }

  return slots;
}

/**
 * Determine whether a slot matches an availability rule.
 *
 * @param {Date} slotStart - UTC Date of slot start
 * @param {Object} rule
 * @param {number[]} rule.weekdays  - array of day-of-week numbers (0=Sun)
 * @param {string}   rule.start_time - 'HH:MM'
 * @param {string}   rule.end_time   - 'HH:MM'
 * @param {string} timezone - IANA timezone string
 * @returns {boolean}
 */
function isSlotMatchingRule(slotStart, rule, timezone) {
  const zonedTime = toZonedTime(slotStart, timezone);
  const dayOfWeek = zonedTime.getDay();

  if (!rule.weekdays.includes(dayOfWeek)) return false;

  // Normalize rule times to HH:MM — DB returns TIME as "HH:MM:SS"
  const ruleStart = String(rule.start_time).substring(0, 5);
  const ruleEnd = String(rule.end_time).substring(0, 5);

  const slotTimeStr = tzFormat(zonedTime, 'HH:mm', { timeZone: timezone });
  return slotTimeStr >= ruleStart && slotTimeStr < ruleEnd;
}

/**
 * Format a Date to an ISO string (UTC).
 * @param {Date} date
 * @returns {string}
 */
function toISOString(date) {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

module.exports = { generateSessionSlots, isSlotMatchingRule, toISOString };
