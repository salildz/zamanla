'use strict';

const config = require('../config');
const sessionRepo = require('../repositories/sessionRepository');
const { generatePublicToken, generateAdminToken } = require('../utils/tokens');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Verify Cloudflare Turnstile token if configured.
 */
async function verifyTurnstile(token) {
  if (!config.turnstile.secretKey) return; // skip if not configured

  if (!token) {
    throw new AppError('Turnstile verification required', 400, 'TURNSTILE_REQUIRED');
  }

  const body = new URLSearchParams({
    secret: config.turnstile.secretKey,
    response: token,
  });

  let result;
  try {
    const res = await fetch(config.turnstile.verifyUrl, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    result = await res.json();
  } catch (err) {
    logger.error('Turnstile verification request failed', { error: err.message });
    throw new AppError('Turnstile verification failed', 500, 'TURNSTILE_ERROR');
  }

  if (!result.success) {
    throw new AppError('Turnstile verification failed', 403, 'TURNSTILE_FAILED');
  }
}

/**
 * Create a new scheduling session.
 */
async function createSession(data, turnstileToken) {
  await verifyTurnstile(turnstileToken);

  const publicToken = generatePublicToken();
  const adminToken = generateAdminToken();

  const session = await sessionRepo.createSession({
    publicToken,
    adminToken,
    title: data.title,
    description: data.description,
    timezone: data.timezone,
    dateStart: data.dateStart,
    dateEnd: data.dateEnd,
    slotMinutes: data.slotMinutes,
    dayStartTime: data.dayStartTime,
    dayEndTime: data.dayEndTime,
    includeWeekends: data.includeWeekends,
    ownerId: data.ownerId || null,
  });

  return session;
}

/**
 * Get a session by public token (public view, no admin token returned).
 */
async function getSessionByPublicToken(publicToken) {
  const session = await sessionRepo.findByPublicToken(publicToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  return session;
}

/**
 * Get a session by admin token (full admin view).
 */
async function getSessionByAdminToken(adminToken) {
  const session = await sessionRepo.findByAdminToken(adminToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  return session;
}

/**
 * Update session settings.
 */
async function updateSession(adminToken, updates) {
  const session = await sessionRepo.findByAdminToken(adminToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  if (session.is_closed) {
    throw new AppError('Cannot update a closed session', 422, 'SESSION_CLOSED');
  }

  const updated = await sessionRepo.updateSession(session.id, updates);
  return updated;
}

/**
 * Close a session (no more participants can add availability).
 */
async function closeSession(adminToken) {
  const session = await sessionRepo.findByAdminToken(adminToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  if (session.is_closed) {
    throw new AppError('Session is already closed', 422, 'SESSION_ALREADY_CLOSED');
  }

  const updated = await sessionRepo.closeSession(session.id);
  return updated;
}

/**
 * Delete a session permanently.
 */
async function deleteSession(adminToken) {
  const session = await sessionRepo.findByAdminToken(adminToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  await sessionRepo.deleteSession(session.id);
}

/**
 * Claim an existing session (by admin token) for an authenticated user.
 */
async function claimSession(adminToken, userId) {
  const claimed = await sessionRepo.claimByAdminToken(adminToken, userId);
  if (claimed) return claimed;

  const existing = await sessionRepo.findByAdminToken(adminToken);
  if (!existing) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (existing.owner_id && existing.owner_id !== userId) {
    throw new AppError('This session is already claimed by another account', 409, 'SESSION_ALREADY_CLAIMED');
  }

  return existing;
}

/**
 * List sessions owned by the authenticated user.
 */
async function getOwnedSessions(userId) {
  return sessionRepo.findByOwnerId(userId);
}

module.exports = {
  verifyTurnstile,
  createSession,
  getSessionByPublicToken,
  getSessionByAdminToken,
  updateSession,
  closeSession,
  deleteSession,
  claimSession,
  getOwnedSessions,
};
