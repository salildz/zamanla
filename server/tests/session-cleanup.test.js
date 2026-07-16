'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../index');
const db = require('../src/config/database');
const sessionRepo = require('../src/repositories/sessionRepository');

const TITLE_PREFIX = 'Cleanup IT ';

// An "ancient" window in the year 2000. Combined with a 10-year retention below,
// the purge only ever matches sessions this suite creates — never the recent
// dates other suites use — so the tests are isolated despite a shared DB.
const ANCIENT_START = '2000-06-14';
const ANCIENT_END = '2000-06-15';
const RETENTION_TEST_DAYS = 3650;

function uniqueTitle(label) {
  return `${TITLE_PREFIX}${label} ${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function createAnonSession({ dateStart, dateEnd, label }) {
  const res = await request(app).post('/api/sessions').send({
    title: uniqueTitle(label),
    timezone: 'Europe/Istanbul',
    dateStart,
    dateEnd,
    slotMinutes: 60,
    dayStartTime: '09:00',
    dayEndTime: '12:00',
    includeWeekends: true,
  });
  assert.equal(res.status, 201, `create failed: ${JSON.stringify(res.body)}`);
  return res.body.data.session;
}

async function createUser() {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, 'test-hash') RETURNING id`,
    [`cleanup_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`]
  );
  return rows[0].id;
}

function today() {
  return new Date().toISOString().substring(0, 10);
}

before(async () => {
  await db.query('DELETE FROM sessions WHERE title LIKE $1', [`${TITLE_PREFIX}%`]);
});

after(async () => {
  await db.query('DELETE FROM users WHERE email LIKE $1', ['cleanup_%@example.com']);
  await db.query('DELETE FROM sessions WHERE title LIKE $1', [`${TITLE_PREFIX}%`]);
  await db.pool.end();
});

test('purge deletes an anonymous session whose window ended long ago', async () => {
  const session = await createAnonSession({ dateStart: ANCIENT_START, dateEnd: ANCIENT_END, label: 'anon-old' });

  const deleted = await sessionRepo.deleteExpiredAnonymousSessions(RETENTION_TEST_DAYS);
  assert.ok(deleted >= 1, 'at least the ancient anonymous session should be deleted');

  const after = await request(app).get(`/api/sessions/${session.publicToken}`);
  assert.equal(after.status, 404, 'purged session should no longer be reachable');
});

test('purge spares a claimed (owned) session even when ancient', async () => {
  const session = await createAnonSession({ dateStart: ANCIENT_START, dateEnd: ANCIENT_END, label: 'owned-old' });
  const userId = await createUser();
  await db.query('UPDATE sessions SET owner_id = $1 WHERE public_token = $2', [userId, session.publicToken]);

  await sessionRepo.deleteExpiredAnonymousSessions(RETENTION_TEST_DAYS);

  const after = await request(app).get(`/api/sessions/${session.publicToken}`);
  assert.equal(after.status, 200, 'claimed session must survive the purge');
});

test('purge spares an anonymous session still within its retention window', async () => {
  const session = await createAnonSession({ dateStart: today(), dateEnd: today(), label: 'anon-recent' });

  await sessionRepo.deleteExpiredAnonymousSessions(RETENTION_TEST_DAYS);

  const after = await request(app).get(`/api/sessions/${session.publicToken}`);
  assert.equal(after.status, 200, 'recent anonymous session must survive the purge');
});

test('expiresAt is exposed for anonymous sessions and null once owned', async () => {
  const session = await createAnonSession({ dateStart: today(), dateEnd: today(), label: 'expiry' });
  assert.ok(session.expiresAt, 'anonymous session should expose expiresAt');

  const userId = await createUser();
  await db.query('UPDATE sessions SET owner_id = $1 WHERE public_token = $2', [userId, session.publicToken]);

  const adminView = await request(app).get(`/api/sessions/admin/${session.adminToken}`);
  assert.equal(adminView.status, 200);
  assert.equal(adminView.body.data.session.expiresAt, null, 'owned session expiresAt should be null');
});
