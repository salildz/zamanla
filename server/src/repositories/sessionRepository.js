'use strict';

const db = require('../config/database');

/**
 * Insert a new session and return it.
 */
async function createSession({
  publicToken,
  adminToken,
  title,
  description,
  timezone,
  dateStart,
  dateEnd,
  slotMinutes,
  dayStartTime,
  dayEndTime,
  includeWeekends,
  ownerId,
}) {
  const { rows } = await db.query(
    `INSERT INTO sessions
       (public_token, admin_token, title, description, timezone,
        date_start, date_end, slot_minutes, day_start_time, day_end_time, include_weekends, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      publicToken,
      adminToken,
      title,
      description || null,
      timezone,
      dateStart,
      dateEnd,
      slotMinutes,
      dayStartTime,
      dayEndTime,
      includeWeekends,
      ownerId || null,
    ]
  );
  return rows[0];
}

/**
 * Find a session by its public token.
 */
async function findByPublicToken(publicToken) {
  const { rows } = await db.query(
    'SELECT * FROM sessions WHERE public_token = $1',
    [publicToken]
  );
  return rows[0] || null;
}

/**
 * Find a session by its admin token.
 */
async function findByAdminToken(adminToken) {
  const { rows } = await db.query(
    'SELECT * FROM sessions WHERE admin_token = $1',
    [adminToken]
  );
  return rows[0] || null;
}

/**
 * Update session fields. Only updates provided (non-undefined) fields.
 */
async function updateSession(id, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  const fieldMap = {
    title: 'title',
    description: 'description',
    timezone: 'timezone',
    dateStart: 'date_start',
    dateEnd: 'date_end',
    slotMinutes: 'slot_minutes',
    dayStartTime: 'day_start_time',
    dayEndTime: 'day_end_time',
    includeWeekends: 'include_weekends',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    // Nothing to update; fetch current
    const { rows } = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return rows[0] || null;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await db.query(
    `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

/**
 * Mark a session as closed.
 */
async function closeSession(id) {
  const { rows } = await db.query(
    'UPDATE sessions SET is_closed = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

/**
 * Delete a session by ID (cascades to participants/slots).
 */
async function deleteSession(id) {
  await db.query('DELETE FROM sessions WHERE id = $1', [id]);
}

async function claimByAdminToken(adminToken, userId) {
  const { rows } = await db.query(
    `UPDATE sessions
     SET owner_id = $2, updated_at = NOW()
     WHERE admin_token = $1
       AND (owner_id IS NULL OR owner_id = $2)
     RETURNING *`,
    [adminToken, userId]
  );
  return rows[0] || null;
}

async function findByOwnerId(ownerId) {
  const { rows } = await db.query(
    'SELECT * FROM sessions WHERE owner_id = $1 ORDER BY created_at DESC',
    [ownerId]
  );
  return rows;
}

module.exports = {
  createSession,
  findByPublicToken,
  findByAdminToken,
  updateSession,
  closeSession,
  deleteSession,
  claimByAdminToken,
  findByOwnerId,
};
