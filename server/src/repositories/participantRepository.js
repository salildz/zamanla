'use strict';

const db = require('../config/database');

/**
 * Create a new participant in a session.
 */
async function createParticipant({ sessionId, name, editToken }) {
  const { rows } = await db.query(
    `INSERT INTO participants (session_id, name, edit_token)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sessionId, name, editToken]
  );
  return rows[0];
}

/**
 * Find a participant by edit token.
 */
async function findByEditToken(editToken) {
  const { rows } = await db.query(
    'SELECT * FROM participants WHERE edit_token = $1',
    [editToken]
  );
  return rows[0] || null;
}

/**
 * Find a participant by edit token scoped to a session.
 */
async function findByEditTokenAndSession(editToken, sessionId) {
  const { rows } = await db.query(
    'SELECT * FROM participants WHERE edit_token = $1 AND session_id = $2',
    [editToken, sessionId]
  );
  return rows[0] || null;
}

/**
 * Get all participants for a session.
 */
async function findBySessionId(sessionId) {
  const { rows } = await db.query(
    'SELECT * FROM participants WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId]
  );
  return rows;
}

/**
 * Update participant name.
 */
async function updateParticipantName(id, name) {
  const { rows } = await db.query(
    'UPDATE participants SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [name, id]
  );
  return rows[0] || null;
}

module.exports = {
  createParticipant,
  findByEditToken,
  findByEditTokenAndSession,
  findBySessionId,
  updateParticipantName,
};
