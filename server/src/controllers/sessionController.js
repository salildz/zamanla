'use strict';

const sessionService = require('../services/sessionService');
const aggregationService = require('../services/aggregationService');
const { createSessionSchema, updateSessionSchema } = require('../validators/sessionValidator');
const { sendSuccess, sendError } = require('../utils/response');
const { AppError } = require('../middleware/errorHandler');
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
 * GET /api/sessions/admin/:adminToken/export
 * Export session results as JSON or CSV.
 */
async function exportSession(req, res) {
  const { adminToken } = req.params;
  const format = (req.query.format || 'json').toLowerCase();

  if (format !== 'json' && format !== 'csv') {
    return sendError(res, 'INVALID_FORMAT', 'Format must be json or csv', 400);
  }

  const { session, slots } = await aggregationService.getExportData(adminToken, format);

  if (format === 'csv') {
    try {
      const { Parser } = require('json2csv');
      const fields = [
        { label: 'Slot Start', value: 'slotStart' },
        { label: 'Slot End', value: 'slotEnd' },
        { label: 'Available Count', value: 'availableCount' },
        { label: 'Participants', value: (row) => row.participants.map((p) => p.name).join(', ') },
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(slots);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="zamanla-${session.public_token}-results.csv"`
      );
      return res.status(200).send(csv);
    } catch (err) {
      logger.error('CSV export error', { error: err.message });
      throw new AppError('Failed to generate CSV export', 500, 'EXPORT_ERROR');
    }
  }

  return sendSuccess(res, {
    session: {
      id: session.id,
      title: session.title,
      timezone: session.timezone,
      dateStart: session.date_start,
      dateEnd: session.date_end,
    },
    slots,
  });
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
  exportSession,
  getResults,
  getMySchedules,
};
