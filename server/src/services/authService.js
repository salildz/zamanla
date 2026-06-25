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

// A real bcrypt hash used to equalize timing when the email isn't registered,
// so login latency doesn't reveal whether an account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('zamanla-timing-equalizer', 12);

async function loginUser({ email, password }) {
  const user = await userRepo.findByEmail(email);

  // Always run a bcrypt comparison (against a dummy hash when the user is absent)
  // to keep the response time independent of account existence.
  const isValid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);

  if (!user || !isValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('Account not found', 404, 'USER_NOT_FOUND');
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
  if (sameAsOld) {
    throw new AppError('New password must be different from the current one', 422, 'PASSWORD_UNCHANGED');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  return userRepo.updatePassword(userId, passwordHash);
}

async function deleteAccount(userId, password) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('Account not found', 404, 'USER_NOT_FOUND');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AppError('Password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  // Owned sessions are preserved (owner_id is set NULL via FK ON DELETE SET NULL);
  // they remain reachable via their admin tokens.
  await userRepo.deleteUser(userId);
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
  changePassword,
  deleteAccount,
  issueAccessToken,
  verifyAccessToken,
};
