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
const EMAIL_PREFIX = 'account-it-';

function uniqueEmail() {
  return `${EMAIL_PREFIX}${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function registerAgent() {
  const agent = request.agent(app);
  const email = uniqueEmail();
  const res = await agent.post('/api/auth/register').send({ email, password: PASSWORD });
  assert.equal(res.status, 201);
  return { agent, email };
}

before(async () => {
  await db.query('DELETE FROM users WHERE email LIKE $1', [`${EMAIL_PREFIX}%`]);
});

after(async () => {
  await db.query('DELETE FROM users WHERE email LIKE $1', [`${EMAIL_PREFIX}%`]);
  await db.pool.end();
});

test('change-password requires authentication', async () => {
  const res = await request(app)
    .post('/api/auth/change-password')
    .send({ currentPassword: PASSWORD, newPassword: 'NewPassword123' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'AUTH_REQUIRED');
});

test('change-password rejects a wrong current password', async () => {
  const { agent } = await registerAgent();
  const res = await agent
    .post('/api/auth/change-password')
    .send({ currentPassword: 'WrongPassword1', newPassword: 'NewPassword123' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('change-password rejects a too-short new password', async () => {
  const { agent } = await registerAgent();
  const res = await agent
    .post('/api/auth/change-password')
    .send({ currentPassword: PASSWORD, newPassword: 'short' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('change-password rejects reusing the same password', async () => {
  const { agent } = await registerAgent();
  const res = await agent
    .post('/api/auth/change-password')
    .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'PASSWORD_UNCHANGED');
});

test('change-password succeeds and the new password works for login', async () => {
  const { email } = await registerAgent();
  const newPassword = 'BrandNewPass987';

  // Use a fresh agent that logs in (so we exercise the full credential path).
  const agent = request.agent(app);
  const loginRes = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  assert.equal(loginRes.status, 200);

  const changeRes = await agent
    .post('/api/auth/change-password')
    .send({ currentPassword: PASSWORD, newPassword });
  assert.equal(changeRes.status, 200);

  // Old password no longer works.
  const oldLogin = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  assert.equal(oldLogin.status, 401);

  // New password works.
  const newLogin = await request(app).post('/api/auth/login').send({ email, password: newPassword });
  assert.equal(newLogin.status, 200);
});

test('delete-account requires the correct password', async () => {
  const { agent } = await registerAgent();
  const res = await agent.post('/api/auth/delete-account').send({ password: 'WrongPassword1' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('delete-account removes the user; login afterwards fails', async () => {
  const { agent, email } = await registerAgent();

  const delRes = await agent.post('/api/auth/delete-account').send({ password: PASSWORD });
  assert.equal(delRes.status, 200);

  // The session cookie is cleared → /me returns null.
  const meRes = await agent.get('/api/auth/me');
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.data.user, null);

  // The account no longer exists.
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  assert.equal(login.status, 401);
});

test('deleting an owner preserves their sessions (owner_id set null)', async () => {
  const { agent } = await registerAgent();

  const createRes = await agent.post('/api/sessions').send({
    title: 'account-it-owned-session',
    timezone: 'Europe/Istanbul',
    dateStart: '2026-03-01',
    dateEnd: '2026-03-01',
    slotMinutes: 60,
    dayStartTime: '09:00',
    dayEndTime: '12:00',
    includeWeekends: true,
  });
  assert.equal(createRes.status, 201);
  const { adminToken, publicToken } = createRes.body.data.session;

  await agent.post('/api/auth/delete-account').send({ password: PASSWORD });

  // Session still reachable; owner is cleared.
  const pub = await request(app).get(`/api/sessions/${publicToken}`);
  assert.equal(pub.status, 200);
  const admin = await request(app).get(`/api/sessions/admin/${adminToken}`);
  assert.equal(admin.status, 200);
  assert.equal(admin.body.data.session.ownerId, null);

  // Cleanup the orphaned session.
  await db.query('DELETE FROM sessions WHERE admin_token = $1', [adminToken]);
});
