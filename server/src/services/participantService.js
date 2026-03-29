'use strict';

const participantRepo = require('../repositories/participantRepository');
const sessionRepo = require('../repositories/sessionRepository');
const slotRepo = require('../repositories/slotRepository');
const availabilityService = require('./availabilityService');
const { generateEditToken } = require('../utils/tokens');
const { AppError } = require('../middleware/errorHandler');
const { verifyTurnstile } = require('./sessionService');
const { withTransaction } = require('../config/database');

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

  // Replace manual slots: always clear existing ones, then insert the new set.
  // This ensures deselected slots and removed overrides are properly removed from the DB.
  if (data.slots !== undefined) {
    await withTransaction(async (client) => {
      await slotRepo.deleteManualSlotsByParticipant(participant.id, client);
      if (data.slots.length > 0) {
        await availabilityService.applyManualSlots(participant.id, session, data.slots, client);
      }
    });
  }

  const slots = await availabilityService.getParticipantSlots(participant.id);
  const rules = await availabilityService.getParticipantRules(participant.id);

  return { participant: updatedParticipant, session, slots, rules };
}

module.exports = { createParticipant, getParticipant, updateParticipant };
