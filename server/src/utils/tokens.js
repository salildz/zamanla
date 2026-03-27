'use strict';

const { nanoid } = require('nanoid');

/**
 * Generate a public token for session sharing (URL-safe, 21 chars).
 * @returns {string}
 */
function generatePublicToken() {
  return nanoid(21);
}

/**
 * Generate an admin token with higher entropy (32 chars).
 * @returns {string}
 */
function generateAdminToken() {
  return nanoid(32);
}

/**
 * Generate an edit token for participants (21 chars).
 * @returns {string}
 */
function generateEditToken() {
  return nanoid(21);
}

module.exports = { generatePublicToken, generateAdminToken, generateEditToken };
