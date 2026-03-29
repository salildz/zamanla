'use strict';

const express = require('express');
const router = express.Router();

const sessionController = require('../controllers/sessionController');
const { requireAuth } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

router.get('/schedules', generalLimiter, requireAuth, sessionController.getMySchedules);

module.exports = router;
