'use strict';

const sessionRepo = require('../repositories/sessionRepository');
const slotRepo = require('../repositories/slotRepository');
const participantRepo = require('../repositories/participantRepository');
const { generateSessionSlots } = require('../utils/timeUtils');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

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

  // Fetch total participant count and available slots in parallel
  const [totalParticipants, dbSlots] = await Promise.all([
    participantRepo.countBySessionId(session.id),
    slotRepo.getAvailableSlotsBySession(session.id),
  ]);

  const generatedSlotStarts = new Set(generatedSlots.map((slot) => slot.slotStart.toISOString()));

  // Build a map: slotStart ISO string -> [{ id, name }]
  const slotMap = new Map();
  const unmatchedSlotStarts = new Set();
  for (const dbSlot of dbSlots) {
    const key = new Date(dbSlot.slot_start).toISOString();
    if (!generatedSlotStarts.has(key)) {
      unmatchedSlotStarts.add(key);
    }
    if (!slotMap.has(key)) {
      slotMap.set(key, []);
    }
    slotMap.get(key).push({
      id: dbSlot.participant_id,
      name: dbSlot.participant_name,
    });
  }

  if (unmatchedSlotStarts.size > 0) {
    logger.warn('Found available slots outside generated session window', {
      sessionId: session.id,
      publicToken,
      unmatchedCount: unmatchedSlotStarts.size,
      sampleSlotStarts: Array.from(unmatchedSlotStarts).slice(0, 5),
    });
  }

  // Build result for each generated slot
  const results = generatedSlots.map((genSlot) => {
    const key = genSlot.slotStart.toISOString();
    const participants = slotMap.get(key) || [];
    return {
      slotStart: genSlot.slotStart.toISOString(),
      slotEnd: genSlot.slotEnd.toISOString(),
      availableCount: participants.length,
      totalParticipants,
      participants,
    };
  });

  // Sort: availableCount desc, then slotStart asc
  results.sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
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
