'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { generateSessionSlots } = require('../src/utils/timeUtils');

// These lock the slot-generation contract that the client mirrors in
// client/src/utils/slotUtils.js. Results are joined on the exact slotStart ISO
// timestamp, so the two generators must agree — especially across DST, where a
// naive "start-of-day + add hours" approach picks the wrong UTC offset.

function starts(session) {
  return generateSessionSlots(session).map((s) => s.slotStart.toISOString());
}

test('slot generation: normal day produces contiguous slots', () => {
  const s = starts({
    date_start: '2026-06-10',
    date_end: '2026-06-10',
    slot_minutes: 30,
    day_start_time: '09:00',
    day_end_time: '12:00',
    include_weekends: true,
    timezone: 'America/New_York',
  });
  // 09:00–12:00 EDT (UTC-4) = 13:00Z..16:00Z, 6 half-hour slots
  assert.equal(s.length, 6);
  assert.equal(s[0], '2026-06-10T13:00:00.000Z');
  assert.equal(s[s.length - 1], '2026-06-10T15:30:00.000Z');
});

test('slot generation: DST spring-forward day uses the post-transition offset', () => {
  // 2026-03-08 is the US spring-forward day (02:00 -> 03:00). A 09:00 window is
  // after the transition, so the offset is EDT (UTC-4): 09:00 -> 13:00Z, NOT 14:00Z.
  const s = starts({
    date_start: '2026-03-08',
    date_end: '2026-03-08',
    slot_minutes: 30,
    day_start_time: '09:00',
    day_end_time: '12:00',
    include_weekends: true,
    timezone: 'America/New_York',
  });
  assert.equal(s.length, 6);
  assert.equal(s[0], '2026-03-08T13:00:00.000Z');
});

test('slot generation: a multi-day range crossing DST stays contiguous per day', () => {
  // London spring transition is 2026-03-29. Span a window around it.
  const s = starts({
    date_start: '2026-03-28',
    date_end: '2026-03-30',
    slot_minutes: 60,
    day_start_time: '09:00',
    day_end_time: '17:00',
    include_weekends: true,
    timezone: 'Europe/London',
  });
  // 8 one-hour slots per day, 3 days = 24
  assert.equal(s.length, 24);
  // Before transition (GMT, UTC+0): 09:00 -> 09:00Z
  assert.equal(s[0], '2026-03-28T09:00:00.000Z');
  // After transition (BST, UTC+1): 09:00 -> 08:00Z
  assert.equal(s[16], '2026-03-30T08:00:00.000Z');
});

test('slot generation: weekends excluded when include_weekends is false', () => {
  // 2026-06-13 is a Saturday, 2026-06-14 a Sunday; only 2026-06-12 (Fri) remains.
  const s = starts({
    date_start: '2026-06-12',
    date_end: '2026-06-14',
    slot_minutes: 60,
    day_start_time: '09:00',
    day_end_time: '11:00',
    include_weekends: false,
    timezone: 'Europe/Istanbul',
  });
  assert.equal(s.length, 2);
});
