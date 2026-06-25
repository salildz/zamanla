'use strict';

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '9051', 10),
  // Supports comma-separated origins: "https://a.com,https://b.com"
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:9050'],

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '9052', 10),
    name: process.env.DB_NAME || 'zamanla',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || null,
    verifyUrl: 'https://challenges.cloudflare.com/turnstile/v1/siteverify',
  },

  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET || 'dev-only-change-me',
    jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || '7d',
    cookieName: process.env.AUTH_COOKIE_NAME || 'zamanla_auth',
    cookieMaxAgeMs: parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS || `${7 * 24 * 60 * 60 * 1000}`, 10),
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },

  // Guardrails to keep a single session from generating an unbounded number of
  // slots (which would blow up /results generation and the client grid).
  limits: {
    maxSpanDays: parseInt(process.env.MAX_SESSION_SPAN_DAYS || '92', 10),
    maxTotalSlots: parseInt(process.env.MAX_SESSION_SLOTS || '5000', 10),
    maxParticipantsPerSession: parseInt(process.env.MAX_PARTICIPANTS_PER_SESSION || '300', 10),
  },

  // Express `trust proxy` setting. Behind a single nginx hop use 1; behind
  // Cloudflare + nginx you may need 2 (or a CIDR list). Configurable so rate
  // limiting reads the real client IP in each deployment.
  trustProxy: process.env.TRUST_PROXY || '1',
};

module.exports = config;
