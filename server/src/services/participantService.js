'use strict';

const participantRepo = require('../repositories/participantRepository');
const sessionRepo = require('../repositories/sessionRepository');
const availabilityService = require('./availabilityService');
const { generateEditToken } = require('../utils/tokens');
const { AppError } = require('../middleware/errorHandler');
const { verifyTurnstile } = require('./sessionService');

/**
 * Add a participant to a session.
 */
async function createParticipant(publicToken, data, turnstileToken) {
  await verifyTurnstile(turnstileToken);

  const session = await sessionRepo.findByPublicToken(publicToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }
  if (session.is_closed) {
    throw new AppError('This session is closed and no longer accepting participants', 422, 'SESSION_CLOSED');
  }

  const editToken = generateEditToken();

  const participant = await participantRepo.createParticipant({
    sessionId: session.id,
    name: data.name,
    editToken,
  });

  return { participant, session };
}

/**
 * Get a participant's availability data for editing.
 */
async function getParticipant(publicToken, editToken) {
  const session = await sessionRepo.findByPublicToken(publicToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  const participant = await participantRepo.findByEditTokenAndSession(editToken, session.id);
  if (!participant) {
    throw new AppError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
  }

  const slots = await availabilityService.getParticipantSlots(participant.id);
  const rules = await availabilityService.getParticipantRules(participant.id);

  return { participant, session, slots, rules };
}

/**
 * Update a participant's name and/or availability.
 */
async function updateParticipant(publicToken, editToken, data) {
  const session = await sessionRepo.findByPublicToken(publicToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  const participant = await participantRepo.findByEditTokenAndSession(editToken, session.id);
  if (!participant) {
    throw new AppError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
  }

  // Update name if provided
  let updatedParticipant = participant;
  if (data.name !== undefined) {
    updatedParticipant = await participantRepo.updateParticipantName(participant.id, data.name);
  }

  // Process rules if provided
  if (data.rules !== undefined) {
    await availabilityService.replaceParticipantRules(participant.id, session, data.rules);
  }

  // Process manual slot overrides if provided
  if (data.slots !== undefined && data.slots.length > 0) {
    await availabilityService.applyManualSlots(participant.id, session.id, data.slots);
  }

  const slots = await availabilityService.getParticipantSlots(participant.id);
  const rules = await availabilityService.getParticipantRules(participant.id);

  return { participant: updatedParticipant, session, slots, rules };
}

module.exports = { createParticipant, getParticipant, updateParticipant };
