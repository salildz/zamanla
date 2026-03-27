'use strict';

const express = require('express');
const router = express.Router();

const sessionRoutes = require('./sessions');
const participantRoutes = require('./participants');

// Session routes (includes admin sub-routes and results)
router.use('/sessions', sessionRoutes);

// Participant routes nested under sessions
// Must use mergeParams in participants router to access :publicToken
router.use('/sessions/:publicToken/participants', participantRoutes);

module.exports = router;
