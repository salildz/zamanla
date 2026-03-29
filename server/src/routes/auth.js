'use strict';

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { optionalAuth } = require('../middleware/auth');
const { authLimiter, generalLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', generalLimiter, authController.logout);
router.get('/me', generalLimiter, optionalAuth, authController.getCurrentUser);

module.exports = router;
