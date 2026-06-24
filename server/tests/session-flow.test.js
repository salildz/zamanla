'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../index');
const db = require('../src/config/database');

const TITLE_PREFIX = 'Flow IT ';

function uniqueTitle(label) {
  return `${TITLE_PREFIX}${label} ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// Two-day window (Sat 2026-01-10, Sun 2026-01-11), 09:00–12:00, hourly →
// 3 slots/day × 2 days = 6 generated slots.
function sessionPayload(title) {
  return {
    title,
    description: 'session flow integration test',
    timezone: 'Europe/Istanbul',
    dateStart: '2026-01-10',
    dateEnd: '2026-01-11',
    slotMinutes: 60,
    dayStartTime: '09:00',
    dayEndTime: '12:00',
    includeWeekends: true,
  };
}

async function createSession(label) {
  const res = await request(app).post('/api/sessions').send(sessionPayload(uniqueTitle(label)));
  assert.equal(res.status, 201, `create failed: ${JSON.stringify(res.body)}`);
  return res.body.data.session; // { publicToken, adminToken, ... }
}

async function getResults(publicToken) {
  const res = await request(app).get(`/api/sessions/${publicToken}/results`);
  assert.equal(res.status, 200);
  return res.body.data.slots;
}

async function join(publicToken, name) {
  const res = await request(app).post(`/api/sessions/${publicToken}/participants`).send({ name });
  assert.equal(res.status, 201, `join failed: ${JSON.stringify(res.body)}`);
  return res.body.data.participant.editToken;
}

async function saveAvailability(publicToken, editToken, { rules = [], slots = [] }) {
  const res = await request(app)
    .put(`/api/sessions/${publicToken}/participants/${editToken}`)
    .send({ rules, slots });
  assert.equal(res.status, 200, `save failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

function manualAvailable(slot) {
  return { slotStart: slot.slotStart, slotEnd: slot.slotEnd, status: 'available', sourceType: 'manual' };
}

before(async () => {
  await db.query('DELETE FROM sessions WHERE title LIKE $1', [`${TITLE_PREFIX}%`]);
});

after(async () => {
  await db.query('DELETE FROM sessions WHERE title LIKE $1', [`${TITLE_PREFIX}%`]);
  await db.pool.end();
});

test('anonymous create returns tokens and a public view', async () => {
  const session = await createSession('Create');
  assert.ok(session.publicToken, 'expected publicToken');
  assert.ok(session.adminToken, 'expected adminToken');
  assert.equal(session.ownerId, null);
  assert.equal(session.isClosed, false);

  const pub = await request(app).get(`/api/sessions/${session.publicToken}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.session.title, session.title);
  // Public view must NOT leak the admin token.
  assert.equal(pub.body.data.session.adminToken, undefined);
});

test('generates the expected slot grid (6 slots) with zero availability initially', async () => {
  const session = await createSession('Grid');
  const slots = await getResults(session.publicToken);
  assert.equal(slots.length, 6, 'expected 3 slots/day × 2 days');
  for (const s of slots) {
    assert.equal(s.availableCount, 0);
    assert.equal(s.totalParticipants, 0);
    assert.deepEqual(s.participants, []);
  }
});

test('participant manual availability is aggregated into results', async () => {
  const session = await createSession('Manual');
  const initial = await getResults(session.publicToken);
  const [s0, s1] = initial; // deterministic: all zero → sorted by time asc

  const editToken = await join(session.publicToken, 'Alice');
  await saveAvailability(session.publicToken, editToken, {
    slots: [manualAvailable(s0), manualAvailable(s1)],
  });

  const after = await getResults(session.publicToken);
  const r0 = after.find((s) => s.slotStart === s0.slotStart);
  const r1 = after.find((s) => s.slotStart === s1.slotStart);

  assert.equal(r0.availableCount, 1);
  assert.equal(r0.totalParticipants, 1);
  assert.deepEqual(r0.participants.map((p) => p.name), ['Alice']);
  assert.equal(r1.availableCount, 1);

  // A slot nobody picked stays empty.
  const untouched = after.find((s) => s.slotStart !== s0.slotStart && s.slotStart !== s1.slotStart);
  assert.equal(untouched.availableCount, 0);
});

test('overlapping availability raises the count and ranks the best slot first', async () => {
  const session = await createSession('Overlap');
  const slots = await getResults(session.publicToken);
  const [s0, s1] = slots;

  const alice = await join(session.publicToken, 'Alice');
  await saveAvailability(session.publicToken, alice, { slots: [manualAvailable(s0), manualAvailable(s1)] });

  const bob = await join(session.publicToken, 'Bob');
  await saveAvailability(session.publicToken, bob, { slots: [manualAvailable(s1)] });

  const after = await getResults(session.publicToken);
  // Results are sorted by availableCount desc → the overlap slot ranks first.
  assert.equal(after[0].slotStart, s1.slotStart);
  assert.equal(after[0].availableCount, 2);
  assert.equal(after[0].totalParticipants, 2);

  const r1 = after.find((s) => s.slotStart === s1.slotStart);
  assert.deepEqual(r1.participants.map((p) => p.name).sort(), ['Alice', 'Bob']);

  const r0 = after.find((s) => s.slotStart === s0.slotStart);
  assert.equal(r0.availableCount, 1);
});

test('a recurring rule expands into per-slot availability', async () => {
  const session = await createSession('Rule');
  const editToken = await join(session.publicToken, 'Carol');

  await saveAvailability(session.publicToken, editToken, {
    rules: [{ weekdays: [0, 1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '12:00' }],
  });

  const after = await getResults(session.publicToken);
  assert.equal(after.length, 6);
  for (const s of after) {
    assert.equal(s.availableCount, 1, 'rule should cover every generated slot');
    assert.deepEqual(s.participants.map((p) => p.name), ['Carol']);
  }
});

test('admin lifecycle: export (csv + json), close, then delete', async () => {
  const session = await createSession('Admin');
  const { adminToken, publicToken } = session;

  const editToken = await join(publicToken, 'Dora');
  const slots = await getResults(publicToken);
  await saveAvailability(publicToken, editToken, { slots: [manualAvailable(slots[0])] });

  // Admin view exposes the admin token.
  const adminRes = await request(app).get(`/api/sessions/admin/${adminToken}`);
  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.body.data.session.adminToken, adminToken);

  // CSV export
  const csvRes = await request(app).get(`/api/sessions/admin/${adminToken}/export?format=csv`);
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.headers['content-type'], /text\/csv/);
  assert.match(csvRes.text, /Slot Start/);
  assert.match(csvRes.text, /Dora/);

  // JSON export
  const jsonRes = await request(app).get(`/api/sessions/admin/${adminToken}/export?format=json`);
  assert.equal(jsonRes.status, 200);
  assert.ok(Array.isArray(jsonRes.body.data.slots));

  // Close
  const closeRes = await request(app).post(`/api/sessions/admin/${adminToken}/close`);
  assert.equal(closeRes.status, 200);
  assert.equal(closeRes.body.data.session.isClosed, true);

  // Joining a closed session is rejected.
  const lateJoin = await request(app).post(`/api/sessions/${publicToken}/participants`).send({ name: 'TooLate' });
  assert.equal(lateJoin.status, 422);
  assert.equal(lateJoin.body.error.code, 'SESSION_CLOSED');

  // Delete
  const delRes = await request(app).delete(`/api/sessions/admin/${adminToken}`);
  assert.equal(delRes.status, 200);

  // Gone afterwards.
  const gone = await request(app).get(`/api/sessions/${publicToken}`);
  assert.equal(gone.status, 404);
  assert.equal(gone.body.error.code, 'SESSION_NOT_FOUND');
});

test('closed session blocks participant edits; reopening restores them', async () => {
  const session = await createSession('CloseEdit')
  const { adminToken, publicToken } = session
  const editToken = await join(publicToken, 'Eve')
  const slots = await getResults(publicToken)

  // Editing works while open.
  await saveAvailability(publicToken, editToken, { slots: [manualAvailable(slots[0])] })

  // Close it.
  const closeRes = await request(app).post(`/api/sessions/admin/${adminToken}/close`)
  assert.equal(closeRes.status, 200)
  assert.equal(closeRes.body.data.session.isClosed, true)

  // An EXISTING participant can no longer save (this is the bug that was fixed).
  const blocked = await request(app)
    .put(`/api/sessions/${publicToken}/participants/${editToken}`)
    .send({ slots: [] })
  assert.equal(blocked.status, 422)
  assert.equal(blocked.body.error.code, 'SESSION_CLOSED')

  // Reopen.
  const reopenRes = await request(app).post(`/api/sessions/admin/${adminToken}/reopen`)
  assert.equal(reopenRes.status, 200)
  assert.equal(reopenRes.body.data.session.isClosed, false)

  // Editing works again.
  await saveAvailability(publicToken, editToken, { slots: [manualAvailable(slots[1])] })

  // Reopening an already-open session is rejected.
  const doubleReopen = await request(app).post(`/api/sessions/admin/${adminToken}/reopen`)
  assert.equal(doubleReopen.status, 422)
  assert.equal(doubleReopen.body.error.code, 'SESSION_ALREADY_OPEN')
})

test('admin can update session settings', async () => {
  const session = await createSession('Update');
  const patch = await request(app)
    .patch(`/api/sessions/admin/${session.adminToken}`)
    .send({ title: `${TITLE_PREFIX}Renamed ${Date.now()}`, slotMinutes: 30 });

  assert.equal(patch.status, 200);
  assert.equal(patch.body.data.session.slotMinutes, 30);
  assert.match(patch.body.data.session.title, /Renamed/);
});

test('validation: rejects an inverted date range', async () => {
  const bad = sessionPayload(uniqueTitle('BadDates'));
  bad.dateStart = '2026-01-20';
  bad.dateEnd = '2026-01-10';
  const res = await request(app).post('/api/sessions').send(bad);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('validation: rejects an empty participant name', async () => {
  const session = await createSession('BadName');
  const res = await request(app).post(`/api/sessions/${session.publicToken}/participants`).send({ name: '' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('unknown tokens return 404 with structured errors', async () => {
  const pub = await request(app).get('/api/sessions/does-not-exist-token');
  assert.equal(pub.status, 404);
  assert.equal(pub.body.error.code, 'SESSION_NOT_FOUND');

  const admin = await request(app).get('/api/sessions/admin/does-not-exist-admin-token');
  assert.equal(admin.status, 404);
});
