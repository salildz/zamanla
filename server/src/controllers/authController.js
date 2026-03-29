'use strict';

const { registerSchema, loginSchema } = require('../validators/authValidator');
const authService = require('../services/authService');
const userRepo = require('../repositories/userRepository');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookies');
const { sendSuccess } = require('../utils/response');
const logger = require('../utils/logger');

async function register(req, res) {
  const parsed = registerSchema.parse(req.body);
  const user = await authService.registerUser(parsed);
  const token = authService.issueAccessToken(user);

  setAuthCookie(res, token);
  logger.info('User registered', { userId: user.id });

  return sendSuccess(res, { user: authService.toSafeUser(user) }, 201);
}

async function login(req, res) {
  const parsed = loginSchema.parse(req.body);
  const user = await authService.loginUser(parsed);
  const token = authService.issueAccessToken(user);

  setAuthCookie(res, token);
  logger.info('User logged in', { userId: user.id });

  return sendSuccess(res, { user: authService.toSafeUser(user) });
}

async function logout(req, res) {
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
}

async function getCurrentUser(req, res) {
  if (!req.authUser?.id) {
    return sendSuccess(res, { user: null });
  }

  const user = await userRepo.findById(req.authUser.id);
  if (!user) {
    clearAuthCookie(res);
    return sendSuccess(res, { user: null });
  }

  return sendSuccess(res, { user: authService.toSafeUser(user) });
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};
