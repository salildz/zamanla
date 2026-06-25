'use strict';

const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

function toUtcMidnight(value) {
  if (value instanceof Date) {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [y, m, d] = String(value).substring(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function minutesOfDay(time) {
  const [h, m] = String(time).substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Estimate how many slots a session would generate. Uses an upper bound (does
 * not subtract excluded weekends) — cheap and conservative, which is what we
 * want for a guardrail.
 */
function estimateSlots({ dateStart, dateEnd, slotMinutes, dayStartTime, dayEndTime }) {
  const spanDays = Math.floor((toUtcMidnight(dateEnd) - toUtcMidnight(dateStart)) / 86400000) + 1;
  const windowMinutes = minutesOfDay(dayEndTime) - minutesOfDay(dayStartTime);
  const perDay = slotMinutes > 0 ? Math.max(0, Math.floor(windowMinutes / slotMinutes)) : 0;
  return { spanDays, totalSlots: Math.max(0, spanDays) * perDay };
}

/**
 * Throw an AppError if the session window would exceed the configured limits.
 * Skips the check for invalid ranges (those are reported by the schema refines).
 */
function assertWithinLimits(sessionLike) {
  const { spanDays, totalSlots } = estimateSlots(sessionLike);
  if (spanDays <= 0 || totalSlots <= 0) return; // invalid range — handled elsewhere

  const { maxSpanDays, maxTotalSlots } = config.limits;

  if (spanDays > maxSpanDays) {
    throw new AppError(
      `Date range is too large (max ${maxSpanDays} days)`,
      422,
      'SESSION_RANGE_TOO_LARGE'
    );
  }
  if (totalSlots > maxTotalSlots) {
    throw new AppError(
      `This configuration generates too many time slots (max ${maxTotalSlots}). Use a shorter range, a larger slot size, or a narrower daily window.`,
      422,
      'SESSION_RANGE_TOO_LARGE'
    );
  }
}

module.exports = { estimateSlots, assertWithinLimits };
