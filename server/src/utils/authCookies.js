'use strict';

const config = require('../config');

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: config.auth.cookieMaxAgeMs,
    path: '/',
  };
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(config.auth.cookieName, token, cookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(config.auth.cookieName, clearCookieOptions());
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
};
