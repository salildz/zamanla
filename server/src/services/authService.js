'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepo = require('../repositories/userRepository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const DEV_FALLBACK_SECRET = 'dev-only-change-me';

const configuredSecret = process.env.AUTH_JWT_SECRET?.trim() || '';
const useEphemeralProdSecret = config.nodeEnv === 'production' && !configuredSecret;
const runtimeJwtSecret = useEphemeralProdSecret
  ? crypto.randomBytes(48).toString('hex')
  : config.auth.jwtSecret;

function warnIfSecretIsRisky() {
  if (useEphemeralProdSecret) {
    logger.error('AUTH_JWT_SECRET is missing in production. Using an ephemeral in-memory fallback secret. Existing auth sessions will be invalidated on every restart. Set AUTH_JWT_SECRET to a strong persistent value.');
    return;
  }

  if (config.nodeEnv === 'production' && config.auth.jwtSecret === DEV_FALLBACK_SECRET) {
    logger.warn('AUTH_JWT_SECRET is using the development default in production. Please set a strong secret.');
  }
}

warnIfSecretIsRisky();

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
    runtimeJwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, runtimeJwtSecret);
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
