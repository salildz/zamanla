'use strict';

const sessionRepo = require('../repositories/sessionRepository');
const slotRepo = require('../repositories/slotRepository');
const { generateSessionSlots } = require('../utils/timeUtils');
const { AppError } = require('../middleware/errorHandler');

/**
 * Aggregate availability results for a session.
 * Returns all generated slots with participant counts and names.
 *
 * @param {string} publicToken
 * @returns {Object} { session, slots: [{ slotStart, slotEnd, count, participants }] }
 */
async function getResults(publicToken) {
  const session = await sessionRepo.findByPublicToken(publicToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  // Generate all possible slots for the session
  const generatedSlots = generateSessionSlots(session);

  // Query available slots from DB
  const dbSlots = await slotRepo.getAvailableSlotsBySession(session.id);

  // Build a map: slotStart ISO string -> [{ participantId, participantName }]
  const slotMap = new Map();
  for (const dbSlot of dbSlots) {
    const key = new Date(dbSlot.slot_start).toISOString();
    if (!slotMap.has(key)) {
      slotMap.set(key, []);
    }
    slotMap.get(key).push({
      id: dbSlot.participant_id,
      name: dbSlot.participant_name,
    });
  }

  // Build result for each generated slot
  const results = generatedSlots.map((genSlot) => {
    const key = genSlot.slotStart.toISOString();
    const participants = slotMap.get(key) || [];
    return {
      slotStart: genSlot.slotStart.toISOString(),
      slotEnd: genSlot.slotEnd.toISOString(),
      count: participants.length,
      participants,
    };
  });

  // Sort: count desc, then slotStart asc
  results.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(a.slotStart) - new Date(b.slotStart);
  });

  return { session, slots: results };
}

/**
 * Build export data for JSON/CSV export.
 *
 * @param {string} adminToken
 * @param {string} format - 'json' | 'csv'
 */
async function getExportData(adminToken, format) {
  const sessionRepoModule = require('../repositories/sessionRepository');
  const session = await sessionRepoModule.findByAdminToken(adminToken);
  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  const { slots } = await getResults(session.public_token);

  if (format === 'csv') {
    return { session, slots, format: 'csv' };
  }

  return { session, slots, format: 'json' };
}

module.exports = { getResults, getExportData };
