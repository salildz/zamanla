'use strict';

const sessionService = require('../services/sessionService');
const aggregationService = require('../services/aggregationService');
const { createSessionSchema, updateSessionSchema } = require('../validators/sessionValidator');
const { sendSuccess } = require('../utils/response');
const logger = require('../utils/logger');

// PostgreSQL TIME fields come back as "HH:MM:SS" — normalize to "HH:MM"
function normalizeTime(t) {
  if (!t) return t;
  return String(t).substring(0, 5);
}

function formatSession(session, includeAdmin = false) {
  const base = {
    id: session.id,
    publicToken: session.public_token,
    title: session.title,
    description: session.description,
    timezone: session.timezone,
    dateStart: session.date_start,
    dateEnd: session.date_end,
    slotMinutes: session.slot_minutes,
    dayStartTime: normalizeTime(session.day_start_time),
    dayEndTime: normalizeTime(session.day_end_time),
    includeWeekends: session.include_weekends,
    isClosed: session.is_closed,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
  if (includeAdmin) {
    base.adminToken = session.admin_token;
    base.ownerId = session.owner_id || null;
  }
  return base;
}

/**
 * POST /api/sessions
 * Create a new scheduling session.
 */
async function createSession(req, res) {
  const parsed = createSessionSchema.parse(req.body);

  const session = await sessionService.createSession(
    {
      ...parsed,
      ownerId: req.authUser?.id || null,
    },
    parsed.cfTurnstileResponse
  );

  logger.info('Session created', { sessionId: session.id, publicToken: session.public_token });

  return sendSuccess(res, { session: formatSession(session, true) }, 201);
}

/**
 * GET /api/sessions/:publicToken
 * Public session view (no admin token).
 */
async function getSession(req, res) {
  const { publicToken } = req.params;
  const session = await sessionService.getSessionByPublicToken(publicToken);

  return sendSuccess(res, { session: formatSession(session) });
}

/**
 * GET /api/sessions/admin/:adminToken
 * Admin session view with full details.
 */
async function getSessionAdmin(req, res) {
  const { adminToken } = req.params;
  const session = await sessionService.getSessionByAdminToken(adminToken);
  return sendSuccess(res, { session: formatSession(session, true) });
}

/**
 * POST /api/sessions/admin/:adminToken/claim
 * Claim an anonymous/admin-token session for the authenticated user.
 */
async function claimSession(req, res) {
  const { adminToken } = req.params;
  const session = await sessionService.claimSession(adminToken, req.authUser.id);

  logger.info('Session claimed by user', {
    sessionId: session.id,
    ownerId: req.authUser.id,
  });

  return sendSuccess(res, { session: formatSession(session, true) });
}

/**
 * PATCH /api/sessions/admin/:adminToken
 * Update session settings.
 */
async function updateSession(req, res) {
  const { adminToken } = req.params;
  const parsed = updateSessionSchema.parse(req.body);

  const session = await sessionService.updateSession(adminToken, parsed);

  return sendSuccess(res, { session: formatSession(session, true) });
}

/**
 * DELETE /api/sessions/admin/:adminToken
 * Delete a session permanently.
 */
async function deleteSession(req, res) {
  const { adminToken } = req.params;
  await sessionService.deleteSession(adminToken);
  return sendSuccess(res, { message: 'Session deleted successfully' });
}

/**
 * POST /api/sessions/admin/:adminToken/close
 * Close a session.
 */
async function closeSession(req, res) {
  const { adminToken } = req.params;
  const session = await sessionService.closeSession(adminToken);

  return sendSuccess(res, { session: formatSession(session, true) });
}

/**
 * POST /api/sessions/admin/:adminToken/reopen
 * Re-open a closed session.
 */
async function reopenSession(req, res) {
  const { adminToken } = req.params;
  const session = await sessionService.reopenSession(adminToken);

  return sendSuccess(res, { session: formatSession(session, true) });
}

/**
 * GET /api/sessions/:publicToken/results
 * Get aggregated availability results for a session.
 */
async function getResults(req, res) {
  const { publicToken } = req.params;
  const { session, slots } = await aggregationService.getResults(publicToken);

  return sendSuccess(res, {
    session: {
      id: session.id,
      publicToken: session.public_token,
      title: session.title,
      timezone: session.timezone,
      slotMinutes: session.slot_minutes,
      isClosed: session.is_closed,
    },
    slots,
  });
}

/**
 * GET /api/my/schedules
 * List schedules owned by the authenticated user.
 */
async function getMySchedules(req, res) {
  const sessions = await sessionService.getOwnedSessions(req.authUser.id);
  return sendSuccess(res, {
    sessions: sessions.map((session) => formatSession(session, true)),
  });
}

module.exports = {
  createSession,
  getSession,
  getSessionAdmin,
  claimSession,
  updateSession,
  deleteSession,
  closeSession,
  reopenSession,
  getResults,
  getMySchedules,
};
