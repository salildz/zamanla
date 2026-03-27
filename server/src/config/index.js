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

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
};

module.exports = config;
