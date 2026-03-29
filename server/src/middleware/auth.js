'use strict';

const config = require('../config');
const authService = require('../services/authService');
const { AppError } = require('./errorHandler');

function extractToken(req) {
  const cookieToken = req.cookies?.[config.auth.cookieName];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

function attachAuthUser(req) {
  const token = extractToken(req);
  if (!token) {
    req.authUser = null;
    return false;
  }

  const payload = authService.verifyAccessToken(token);
  if (!payload || !payload.id) {
    req.authUser = null;
    return false;
  }

  req.authUser = { id: payload.id, email: payload.email };
  return true;
}

function optionalAuth(req, res, next) {
  attachAuthUser(req);
  next();
}

function requireAuth(req, res, next) {
  const ok = attachAuthUser(req);
  if (!ok) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }
  next();
}

module.exports = {
  optionalAuth,
  requireAuth,
};
