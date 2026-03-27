'use strict';

const participantService = require('../services/participantService');
const { createParticipantSchema, updateParticipantSchema } = require('../validators/participantValidator');
const { sendSuccess } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /api/sessions/:publicToken/participants
 * Add a new participant to a session.
 */
async function createParticipant(req, res) {
  const { publicToken } = req.params;
  const parsed = createParticipantSchema.parse(req.body);

  const { participant, session } = await participantService.createParticipant(
    publicToken,
    parsed,
    parsed.cfTurnstileResponse
  );

  logger.info('Participant created', {
    participantId: participant.id,
    sessionId: session.id,
    publicToken,
  });

  return sendSuccess(res, {
    participant: {
      id: participant.id,
      name: participant.name,
      editToken: participant.edit_token,
      sessionId: participant.session_id,
      createdAt: participant.created_at,
    },
  }, 201);
}

/**
 * GET /api/sessions/:publicToken/participants/:editToken
 * Get a participant's current availability for editing.
 */
async function getParticipant(req, res) {
  const { publicToken, editToken } = req.params;

  const { participant, session, slots, rules } = await participantService.getParticipant(
    publicToken,
    editToken
  );

  return sendSuccess(res, {
    participant: {
      id: participant.id,
      name: participant.name,
      editToken: participant.edit_token,
      createdAt: participant.created_at,
      updatedAt: participant.updated_at,
    },
    session: {
      id: session.id,
      publicToken: session.public_token,
      title: session.title,
      timezone: session.timezone,
      dateStart: session.date_start,
      dateEnd: session.date_end,
      slotMinutes: session.slot_minutes,
      dayStartTime: session.day_start_time,
      dayEndTime: session.day_end_time,
      includeWeekends: session.include_weekends,
      isClosed: session.is_closed,
    },
    rules: rules.map((r) => ({
      id: r.id,
      weekdays: r.weekdays,
      startTime: r.start_time,
      endTime: r.end_time,
    })),
    slots: slots.map((s) => ({
      id: s.id,
      slotStart: s.slot_start,
      slotEnd: s.slot_end,
      status: s.status,
      sourceType: s.source_type,
    })),
  });
}

/**
 * PUT /api/sessions/:publicToken/participants/:editToken
 * Update a participant's name and/or availability.
 */
async function updateParticipant(req, res) {
  const { publicToken, editToken } = req.params;
  const parsed = updateParticipantSchema.parse(req.body);

  const { participant, session, slots, rules } = await participantService.updateParticipant(
    publicToken,
    editToken,
    parsed
  );

  logger.info('Participant updated', { participantId: participant.id });

  return sendSuccess(res, {
    participant: {
      id: participant.id,
      name: participant.name,
      editToken: participant.edit_token,
      createdAt: participant.created_at,
      updatedAt: participant.updated_at,
    },
    session: {
      id: session.id,
      publicToken: session.public_token,
      title: session.title,
      timezone: session.timezone,
      slotMinutes: session.slot_minutes,
    },
    rules: rules.map((r) => ({
      id: r.id,
      weekdays: r.weekdays,
      startTime: r.start_time,
      endTime: r.end_time,
    })),
    slots: slots.map((s) => ({
      id: s.id,
      slotStart: s.slot_start,
      slotEnd: s.slot_end,
      status: s.status,
      sourceType: s.source_type,
    })),
  });
}

module.exports = { createParticipant, getParticipant, updateParticipant };
