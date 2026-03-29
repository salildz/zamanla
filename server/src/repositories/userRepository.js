'use strict';

const db = require('../config/database');

async function createUser({ email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING *`,
    [email, passwordHash]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
};
