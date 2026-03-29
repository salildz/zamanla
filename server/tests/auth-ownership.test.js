'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../index');
const db = require('../src/config/database');

const PASSWORD = 'Password1234';
const EMAIL_PREFIX = 'auth-it-';
const SESSION_TITLE_PREFIX = 'Auth IT ';

function buildUniqueEmail() {
  return `${EMAIL_PREFIX}${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function buildSessionPayload(title) {
  return {
    title,
    description: 'integration test session',
    timezone: 'Europe/Istanbul',
    dateStart: '2026-01-10',
    dateEnd: '2026-01-11',
    slotMinutes: 60,
    dayStartTime: '09:00',
    dayEndTime: '12:00',
    includeWeekends: true,
  };
}

async function cleanupTestData() {
  await db.query('DELETE FROM sessions WHERE title LIKE $1', [`${SESSION_TITLE_PREFIX}%`]);
  await db.query('DELETE FROM users WHERE email LIKE $1', [`${EMAIL_PREFIX}%`]);
}

async function registerAndGetAgent() {
  const agent = request.agent(app);
  const email = buildUniqueEmail();

  const registerRes = await agent
    .post('/api/auth/register')
    .send({ email, password: PASSWORD });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.body.success, true);
  assert.equal(registerRes.body.data.user.email, email.toLowerCase());

  return { agent, email, userId: registerRes.body.data.user.id };
}

before(async () => {
  await cleanupTestData();
});

after(async () => {
  await cleanupTestData();
  await db.pool.end();
});

test('register sets auth cookie and /auth/me returns user', async () => {
  const { agent, email } = await registerAndGetAgent();

  const meRes = await agent.get('/api/auth/me');
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.success, true);
  assert.equal(meRes.body.data.user.email, email.toLowerCase());
});

test('authenticated session creation assigns owner and appears in /my/schedules', async () => {
  const { agent, userId } = await registerAndGetAgent();
  const title = `${SESSION_TITLE_PREFIX}Owned ${Date.now()}`;

  const createRes = await agent
    .post('/api/sessions')
    .send(buildSessionPayload(title));

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.equal(createRes.body.data.session.title, title);
  assert.equal(Number(createRes.body.data.session.ownerId), Number(userId));

  const myRes = await agent.get('/api/my/schedules');
  assert.equal(myRes.status, 200);
  assert.equal(myRes.body.success, true);

  const listed = myRes.body.data.sessions.find(
    (s) => s.adminToken === createRes.body.data.session.adminToken
  );

  assert.ok(listed, 'Expected created session to be listed in owned schedules');
  assert.equal(Number(listed.ownerId), Number(userId));
});

test('authenticated user can claim an anonymous admin session', async () => {
  const anonTitle = `${SESSION_TITLE_PREFIX}Anonymous ${Date.now()}`;
  const anonCreateRes = await request(app)
    .post('/api/sessions')
    .send(buildSessionPayload(anonTitle));

  assert.equal(anonCreateRes.status, 201);
  assert.equal(anonCreateRes.body.success, true);
  assert.equal(anonCreateRes.body.data.session.ownerId, null);

  const adminToken = anonCreateRes.body.data.session.adminToken;

  const { agent, userId } = await registerAndGetAgent();

  const claimRes = await agent.post(`/api/sessions/admin/${adminToken}/claim`);
  assert.equal(claimRes.status, 200);
  assert.equal(claimRes.body.success, true);
  assert.equal(Number(claimRes.body.data.session.ownerId), Number(userId));

  const myRes = await agent.get('/api/my/schedules');
  assert.equal(myRes.status, 200);
  const claimed = myRes.body.data.sessions.find((s) => s.adminToken === adminToken);
  assert.ok(claimed, 'Expected claimed session to be listed in owned schedules');
});

test('claiming already-owned session by another user returns conflict', async () => {
  const anonTitle = `${SESSION_TITLE_PREFIX}Conflict ${Date.now()}`;
  const anonCreateRes = await request(app)
    .post('/api/sessions')
    .send(buildSessionPayload(anonTitle));

  assert.equal(anonCreateRes.status, 201);
  const adminToken = anonCreateRes.body.data.session.adminToken;

  const ownerA = await registerAndGetAgent();
  const claimByARes = await ownerA.agent.post(`/api/sessions/admin/${adminToken}/claim`);
  assert.equal(claimByARes.status, 200);

  const ownerB = await registerAndGetAgent();
  const claimByBRes = await ownerB.agent.post(`/api/sessions/admin/${adminToken}/claim`);

  assert.equal(claimByBRes.status, 409);
  assert.equal(claimByBRes.body.success, false);
  assert.equal(claimByBRes.body.error.code, 'SESSION_ALREADY_CLAIMED');
});

test('claim endpoint requires authentication', async () => {
  const anonTitle = `${SESSION_TITLE_PREFIX}NoAuth ${Date.now()}`;
  const anonCreateRes = await request(app)
    .post('/api/sessions')
    .send(buildSessionPayload(anonTitle));

  assert.equal(anonCreateRes.status, 201);
  const adminToken = anonCreateRes.body.data.session.adminToken;

  const unauthClaimRes = await request(app).post(`/api/sessions/admin/${adminToken}/claim`);
  assert.equal(unauthClaimRes.status, 401);
  assert.equal(unauthClaimRes.body.success, false);
  assert.equal(unauthClaimRes.body.error.code, 'AUTH_REQUIRED');
});
