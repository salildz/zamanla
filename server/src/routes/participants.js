'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });

const participantCtrl = require('../controllers/participantController');
const { createLimiter, generalLimiter } = require('../middleware/rateLimiter');

// POST /api/sessions/:publicToken/participants
router.post('/', createLimiter, participantCtrl.createParticipant);

// GET /api/sessions/:publicToken/participants/:editToken
router.get('/:editToken', generalLimiter, participantCtrl.getParticipant);

// PUT /api/sessions/:publicToken/participants/:editToken
router.put('/:editToken', generalLimiter, participantCtrl.updateParticipant);

module.exports = router;
