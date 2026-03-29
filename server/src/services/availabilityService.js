'use strict';

const slotRepo = require('../repositories/slotRepository');
const { generateSessionSlots, isSlotMatchingRule } = require('../utils/timeUtils');
const { withTransaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all availability rules for a participant.
 */
async function getParticipantRules(participantId) {
  return slotRepo.getRulesByParticipant(participantId);
}

/**
 * Get all availability slots for a participant.
 */
async function getParticipantSlots(participantId) {
  return slotRepo.getSlotsByParticipant(participantId);
}

/**
 * Expand a set of rules into concrete slot objects for a session.
 *
 * @param {string} participantId
 * @param {string} sessionId
 * @param {Object} session - full session record
 * @param {Array} rules - array of { weekdays, startTime, endTime }
 * @returns {Array} slot objects ready for upsert
 */
function expandRulesToSlots(participantId, sessionId, session, rules) {
  const allSlots = generateSessionSlots(session);
  const matchedSlots = [];

  for (const slot of allSlots) {
    for (const rule of rules) {
      const ruleNormalized = {
        weekdays: rule.weekdays,
        start_time: rule.startTime || rule.start_time,
        end_time: rule.endTime || rule.end_time,
      };
      if (isSlotMatchingRule(slot.slotStart, ruleNormalized, session.timezone)) {
        matchedSlots.push({
          participantId,
          sessionId,
          slotStart: slot.slotStart,
          slotEnd: slot.slotEnd,
          status: 'available',
          sourceType: 'rule_derived',
        });
        break; // avoid duplicates if multiple rules match
      }
    }
  }

  return matchedSlots;
}

/**
 * Replace all rules for a participant and regenerate rule_derived slots.
 * Manual slots are preserved.
 *
 * @param {string} participantId
 * @param {Object} session
 * @param {Array} rules - array of { weekdays, startTime, endTime }
 */
async function replaceParticipantRules(participantId, session, rules) {
  await withTransaction(async (client) => {
    // 1. Delete old rules
    await slotRepo.deleteRulesByParticipant(participantId, client);

    // 2. Insert new rules
    if (rules.length > 0) {
      const rulesForInsert = rules.map((r) => ({
        participantId,
        sessionId: session.id,
        weekdays: r.weekdays,
        startTime: r.startTime,
        endTime: r.endTime,
      }));
      await slotRepo.insertRules(rulesForInsert, client);
    }

    // 3. Delete existing rule_derived slots
    await slotRepo.deleteRuleDerivedSlotsByParticipant(participantId, client);

    // 4. Expand rules into slots and upsert
    if (rules.length > 0) {
      const newSlots = expandRulesToSlots(participantId, session.id, session, rules);
      if (newSlots.length > 0) {
        await slotRepo.upsertSlots(newSlots, client);
      }
    }
  });
}

/**
 * Apply manual slot overrides for a participant.
 * Manual slots take priority - they are upserted and override any existing entry.
 *
 * @param {string} participantId
 * @param {Object} session
 * @param {Array} slots - array of { slotStart, status, sourceType }
 * @param {import('pg').PoolClient} [client]
 */
async function applyManualSlots(participantId, session, slots, client) {
  const slotMinutes = Number(session.slot_minutes ?? session.slotMinutes ?? 30);
  const slotDurationMs = Number.isFinite(slotMinutes) && slotMinutes > 0
    ? slotMinutes * 60 * 1000
    : 30 * 60 * 1000;

  const slotsForUpsert = slots.map((slot) => {
    const slotStart = new Date(slot.slotStart);
    if (Number.isNaN(slotStart.getTime())) {
      throw new AppError('Invalid manual slot start time', 400, 'INVALID_SLOT_START');
    }

    const slotEnd = slot.slotEnd
      ? new Date(slot.slotEnd)
      : new Date(slotStart.getTime() + slotDurationMs);
    if (Number.isNaN(slotEnd.getTime())) {
      throw new AppError('Invalid manual slot end time', 400, 'INVALID_SLOT_END');
    }
    if (slotEnd <= slotStart) {
      throw new AppError('Manual slot end must be after slot start', 400, 'INVALID_SLOT_RANGE');
    }

    return {
      participantId,
      sessionId: session.id,
      slotStart,
      slotEnd,
      status: slot.status || 'available',
      sourceType: 'manual',
    };
  });

  await slotRepo.upsertSlots(slotsForUpsert, client);
}

module.exports = {
  getParticipantRules,
  getParticipantSlots,
  expandRulesToSlots,
  replaceParticipantRules,
  applyManualSlots,
};
