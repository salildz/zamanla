'use strict';

const express = require('express');
const router = express.Router();

const sessionCtrl = require('../controllers/sessionController');
const participantCtrl = require('../controllers/participantController');
const { createLimiter, adminLimiter, exportLimiter, generalLimiter } = require('../middleware/rateLimiter');

// ─── Session creation ───────────────────────────────────────────────────────
// POST /api/sessions
router.post('/', createLimiter, sessionCtrl.createSession);

// ─── Admin routes (must be registered BEFORE /:publicToken to avoid conflicts) ──
// GET /api/sessions/admin/:adminToken
router.get('/admin/:adminToken', adminLimiter, sessionCtrl.getSessionAdmin);

// PATCH /api/sessions/admin/:adminToken
router.patch('/admin/:adminToken', adminLimiter, sessionCtrl.updateSession);

// DELETE /api/sessions/admin/:adminToken
router.delete('/admin/:adminToken', adminLimiter, sessionCtrl.deleteSession);

// POST /api/sessions/admin/:adminToken/close
router.post('/admin/:adminToken/close', adminLimiter, sessionCtrl.closeSession);

// GET /api/sessions/admin/:adminToken/export
router.get('/admin/:adminToken/export', exportLimiter, sessionCtrl.exportSession);

// ─── Public session view ────────────────────────────────────────────────────
// GET /api/sessions/:publicToken
router.get('/:publicToken', generalLimiter, sessionCtrl.getSession);

// ─── Results ────────────────────────────────────────────────────────────────
// GET /api/sessions/:publicToken/results
router.get('/:publicToken/results', generalLimiter, sessionCtrl.getResults);

module.exports = router;
