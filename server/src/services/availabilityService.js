'use strict';

const slotRepo = require('../repositories/slotRepository');
const { generateSessionSlots, isSlotMatchingRule } = require('../utils/timeUtils');
const { withTransaction } = require('../config/database');

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
 * @param {string} sessionId
 * @param {Array} slots - array of { slotStart, status, sourceType }
 */
async function applyManualSlots(participantId, sessionId, slots) {
  // Build slot objects for upsert
  // We need slotEnd; since we don't have it here, we'll compute it from session slot_minutes.
  // However, for manual overrides the slotEnd can be derived from session or stored as-is.
  // The caller passes slotStart; we'll store slotEnd = slotStart + slot_minutes from session.
  // Since session isn't passed here, we accept optional slotEnd in the slot data, or default to slotStart + 30 min.
  // Better: accept slotEnd in the slot override schema, or query session for slot_minutes.
  // For simplicity, we query session inside participantService; here we accept slotEnd too.
  const slotsForUpsert = slots.map((slot) => ({
    participantId,
    sessionId,
    slotStart: new Date(slot.slotStart),
    slotEnd: slot.slotEnd ? new Date(slot.slotEnd) : new Date(new Date(slot.slotStart).getTime() + 30 * 60 * 1000),
    status: slot.status || 'available',
    sourceType: slot.sourceType || 'manual',
  }));

  await slotRepo.upsertSlots(slotsForUpsert);
}

module.exports = {
  getParticipantRules,
  getParticipantSlots,
  expandRulesToSlots,
  replaceParticipantRules,
  applyManualSlots,
};
