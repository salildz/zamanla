'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepo = require('../repositories/userRepository');
const { AppError } = require('../middleware/errorHandler');

const DEV_FALLBACK_SECRET = 'dev-only-change-me';

function ensureSecretConfigured() {
  if (config.nodeEnv === 'production' && config.auth.jwtSecret === DEV_FALLBACK_SECRET) {
    throw new Error('AUTH_JWT_SECRET must be set in production');
  }
}

ensureSecretConfigured();

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function registerUser({ email, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return userRepo.createUser({ email, passwordHash });
}

async function loginUser({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return user;
}

function issueAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    return {
      id: decoded.sub,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}

module.exports = {
  toSafeUser,
  registerUser,
  loginUser,
  issueAccessToken,
  verifyAccessToken,
};
