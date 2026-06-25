'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { estimateSlots, assertWithinLimits } = require('../src/utils/sessionLimits');

test('estimateSlots: counts an inclusive day span and per-day slots', () => {
  const { spanDays, totalSlots } = estimateSlots({
    dateStart: '2026-06-01',
    dateEnd: '2026-06-01',
    slotMinutes: 30,
    dayStartTime: '09:00',
    dayEndTime: '12:00',
  });
  assert.equal(spanDays, 1);
  assert.equal(totalSlots, 6);
});

test('assertWithinLimits: allows a reasonable session', () => {
  assert.doesNotThrow(() =>
    assertWithinLimits({
      dateStart: '2026-06-01',
      dateEnd: '2026-06-14',
      slotMinutes: 30,
      dayStartTime: '09:00',
      dayEndTime: '18:00',
    })
  );
});

test('assertWithinLimits: rejects an over-long span', () => {
  assert.throws(
    () =>
      assertWithinLimits({
        dateStart: '2026-01-01',
        dateEnd: '2027-01-01',
        slotMinutes: 30,
        dayStartTime: '09:00',
        dayEndTime: '10:00',
      }),
    /SESSION_RANGE_TOO_LARGE|too large/i
  );
});

test('assertWithinLimits: rejects too many slots even within the day cap', () => {
  assert.throws(
    () =>
      assertWithinLimits({
        dateStart: '2026-01-01',
        dateEnd: '2026-03-15', // ~73 days, under the day cap
        slotMinutes: 5,
        dayStartTime: '00:00',
        dayEndTime: '23:55', // 287 slots/day -> well over the slot cap
      }),
    /too many time slots|SESSION_RANGE_TOO_LARGE/i
  );
});

test('assertWithinLimits: ignores invalid ranges (left to schema refines)', () => {
  assert.doesNotThrow(() =>
    assertWithinLimits({
      dateStart: '2026-06-14',
      dateEnd: '2026-06-01', // inverted
      slotMinutes: 30,
      dayStartTime: '09:00',
      dayEndTime: '18:00',
    })
  );
});
