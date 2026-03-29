'use strict';

const db = require('../config/database');

// ─── Availability Rules ────────────────────────────────────────────────────

/**
 * Insert a batch of rules for a participant.
 */
async function insertRules(rules, client) {
  const conn = client || db;
  const inserted = [];
  for (const rule of rules) {
    const { rows } = await conn.query(
      `INSERT INTO availability_rules (participant_id, session_id, weekdays, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [rule.participantId, rule.sessionId, rule.weekdays, rule.startTime, rule.endTime]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

/**
 * Delete all rules for a participant.
 */
async function deleteRulesByParticipant(participantId, client) {
  const conn = client || db;
  await conn.query('DELETE FROM availability_rules WHERE participant_id = $1', [participantId]);
}

/**
 * Get all rules for a participant.
 */
async function getRulesByParticipant(participantId) {
  const { rows } = await db.query(
    'SELECT * FROM availability_rules WHERE participant_id = $1 ORDER BY created_at ASC',
    [participantId]
  );
  return rows;
}

// ─── Availability Slots ────────────────────────────────────────────────────

/**
 * Upsert a batch of slots for a participant.
 * On conflict (participant_id, slot_start), update status and source_type.
 */
async function upsertSlots(slots, client) {
  if (slots.length === 0) return [];
  const conn = client || db;
  const inserted = [];

  for (const slot of slots) {
    const { rows } = await conn.query(
      `INSERT INTO availability_slots
         (participant_id, session_id, slot_start, slot_end, status, source_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (participant_id, slot_start)
       DO UPDATE SET
         status = EXCLUDED.status,
         source_type = EXCLUDED.source_type,
         slot_end = EXCLUDED.slot_end
       RETURNING *`,
      [
        slot.participantId,
        slot.sessionId,
        slot.slotStart,
        slot.slotEnd,
        slot.status || 'available',
        slot.sourceType || 'manual',
      ]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

/**
 * Delete all slots for a participant (used when replacing rule_derived slots).
 */
async function deleteSlotsByParticipant(participantId, client) {
  const conn = client || db;
  await conn.query('DELETE FROM availability_slots WHERE participant_id = $1', [participantId]);
}

/**
 * Delete only rule_derived slots for a participant, preserving manual overrides.
 */
async function deleteRuleDerivedSlotsByParticipant(participantId, client) {
  const conn = client || db;
  await conn.query(
    "DELETE FROM availability_slots WHERE participant_id = $1 AND source_type = 'rule_derived'",
    [participantId]
  );
}

/**
 * Delete only manual slots for a participant, preserving rule_derived slots.
 */
async function deleteManualSlotsByParticipant(participantId, client) {
  const conn = client || db;
  await conn.query(
    "DELETE FROM availability_slots WHERE participant_id = $1 AND source_type = 'manual'",
    [participantId]
  );
}

/**
 * Get all available slots for a session.
 */
async function getAvailableSlotsBySession(sessionId) {
  const { rows } = await db.query(
    `SELECT s.*, p.name AS participant_name
     FROM availability_slots s
     JOIN participants p ON p.id = s.participant_id
     WHERE s.session_id = $1 AND s.status = 'available'
     ORDER BY s.slot_start ASC`,
    [sessionId]
  );
  return rows;
}

/**
 * Get all slots for a specific participant.
 */
async function getSlotsByParticipant(participantId) {
  const { rows } = await db.query(
    'SELECT * FROM availability_slots WHERE participant_id = $1 ORDER BY slot_start ASC',
    [participantId]
  );
  return rows;
}

module.exports = {
  insertRules,
  deleteRulesByParticipant,
  getRulesByParticipant,
  upsertSlots,
  deleteSlotsByParticipant,
  deleteRuleDerivedSlotsByParticipant,
  deleteManualSlotsByParticipant,
  getAvailableSlotsBySession,
  getSlotsByParticipant,
};
