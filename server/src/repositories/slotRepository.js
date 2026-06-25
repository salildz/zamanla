'use strict';

const db = require('../config/database');

// ─── Availability Rules ────────────────────────────────────────────────────

/**
 * Insert a batch of rules for a participant in a single multi-row INSERT.
 */
async function insertRules(rules, client) {
  if (rules.length === 0) return [];
  const conn = client || db;

  const valueGroups = [];
  const params = [];
  let p = 1;
  for (const rule of rules) {
    valueGroups.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
    params.push(rule.participantId, rule.sessionId, rule.weekdays, rule.startTime, rule.endTime);
  }

  const { rows } = await conn.query(
    `INSERT INTO availability_rules (participant_id, session_id, weekdays, start_time, end_time)
     VALUES ${valueGroups.join(', ')}
     RETURNING *`,
    params
  );
  return rows;
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
 * Upsert a batch of slots for a participant using chunked multi-row INSERTs.
 * On conflict (participant_id, slot_start) the row is updated.
 *
 * @param {Array} slots
 * @param {import('pg').PoolClient} [client]
 * @param {Object} [options]
 * @param {boolean} [options.preserveManual] when true, a conflicting row that is
 *   already a manual override is left untouched (rule expansion must never clobber
 *   a participant's manual choice).
 */
async function upsertSlots(slots, client, options = {}) {
  if (slots.length === 0) return;
  const conn = client || db;
  const { preserveManual = false } = options;

  // Dedupe within the batch — a multi-row upsert cannot touch the same conflict
  // target twice. Last occurrence wins, matching the previous row-by-row behavior.
  const deduped = [
    ...new Map(
      slots.map((s) => {
        const startKey = s.slotStart instanceof Date ? s.slotStart.toISOString() : String(s.slotStart);
        return [`${s.participantId}|${startKey}`, s];
      })
    ).values(),
  ];

  const conflictClause = preserveManual
    ? `DO UPDATE SET status = EXCLUDED.status, source_type = EXCLUDED.source_type, slot_end = EXCLUDED.slot_end
         WHERE availability_slots.source_type <> 'manual'`
    : `DO UPDATE SET status = EXCLUDED.status, source_type = EXCLUDED.source_type, slot_end = EXCLUDED.slot_end`;

  const CHUNK_SIZE = 500;
  for (let i = 0; i < deduped.length; i += CHUNK_SIZE) {
    const chunk = deduped.slice(i, i + CHUNK_SIZE);
    const valueGroups = [];
    const params = [];
    let p = 1;
    for (const slot of chunk) {
      valueGroups.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(
        slot.participantId,
        slot.sessionId,
        slot.slotStart,
        slot.slotEnd,
        slot.status || 'available',
        slot.sourceType || 'manual'
      );
    }

    await conn.query(
      `INSERT INTO availability_slots
         (participant_id, session_id, slot_start, slot_end, status, source_type)
       VALUES ${valueGroups.join(', ')}
       ON CONFLICT (participant_id, slot_start) ${conflictClause}`,
      params
    );
  }
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
